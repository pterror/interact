/**
 * Compiles the package's components with the Svelte the tests run on, for tests: each `.svelte` file into JavaScript
 * beside a copy of the package's modules, under node_modules (so the compiled files import what the package does), in
 * the syntax that Svelte reads (runes for Svelte 5, the legacy syntax for Svelte 4)
 */

// oxlint-disable-next-line import/no-namespace -- compileModule is Svelte 5's: a named import of it fails to link on Svelte 4
import * as compiler from 'svelte/compiler'

const { compile, VERSION } = compiler

const SRC = new URL('.', import.meta.url).pathname
const MAJOR = Number(VERSION.split('.')[0])

/**
 * Compiles every component for a target, once per test run
 * @param {'client' | 'server'} target - Where the components run
 * @returns {Promise<string>} The compiled package index, to import
 */
async function compiled(target) {
  const out = `${SRC}../node_modules/.compiled/${target}`
  await Bun.$`rm -rf ${out} && mkdir -p ${out}`.quiet()
  const files = await Array.fromAsync(new Bun.Glob('**/*.{js,svelte}').scan({ cwd: SRC }))
  await Promise.all(
    files
      .filter(
        (file) => !file.endsWith('.test.js') && (!file.endsWith('.svelte') || file.startsWith('legacy/') === MAJOR < 5),
      )
      .map(async (file) => {
        const text = await Bun.file(`${SRC}${file}`).text()
        /** @type {Readonly<Record<string, unknown>>} */
        const legacy = MAJOR >= 5 ? {} : { generate: target === 'server' ? 'ssr' : 'dom', hydratable: true }
        const code = file.endsWith('.svelte')
          ? compile(text, { filename: file, generate: target, ...legacy }).js.code
          : text
        const rewritten = code.replaceAll(
          /(?<from>from\s+['"][^'"]+)\.svelte(?<quote>['"])/gu,
          '$<from>.svelte.js$<quote>',
        )
        await Bun.write(`${out}/${file}${file.endsWith('.svelte') ? '.js' : ''}`, rewritten)
      }),
  )
  if (MAJOR >= 5 && 'compileModule' in compiler && typeof compiler.compileModule === 'function') {
    const state = compiler.compileModule(
      'export function reactive(initial) { const made = $state(initial); return made }',
      {
        filename: 'state.svelte.js',
        generate: target,
      },
    )
    await Bun.write(`${out}/state.svelte.js`, state.js.code)
  }
  return `${out}/${MAJOR >= 5 ? 'index.js' : 'legacy/index.js'}`
}

/**
 * A compiled module's exports
 * @param {string} path - The module
 * @returns {Promise<Readonly<Record<string, unknown>>>} Its exports
 */
async function load(path) {
  /** @type {unknown} */
  const loaded = await import(path)
  if (typeof loaded !== 'object' || loaded === null) {
    throw new TypeError(`${path} is not a module`)
  }
  return Object.fromEntries(Object.entries(loaded))
}

export { compiled, load, MAJOR }
