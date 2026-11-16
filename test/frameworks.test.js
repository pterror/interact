/**
 * Runs each framework package's tests against every other version of its framework the package supports: each
 * directory in test/frameworks is a workspace whose dependencies are one version, into which the package's sources and
 * tests are copied (under its node_modules, where nothing else looks for tests), so the framework they import is that
 * version. The package's own run, in the main suite, is the version its manifest develops against.
 */

import { describe, expect, test } from 'bun:test'

const ROOT = new URL('..', import.meta.url).pathname
/** How long one version's run may take: it starts its own test process */
const VERSION_MS = 120_000

/** @type {Readonly<Record<string, string>>} */
const PACKAGES = { react: 'react', solid: 'solid', svelte: 'svelte', vue: 'vue' }

const fixtures = await Array.fromAsync(new Bun.Glob('*/package.json').scan({ cwd: `${ROOT}test/frameworks` }))

/**
 * Runs a package's tests in a fixture
 * @param {string} fixture - The fixture's directory name (`react-18.3.1`)
 * @returns {Promise<Readonly<{ code: number, output: string }>>} How the run ended, and what it printed
 */
async function runIn(fixture) {
  const framework = fixture.replace(/-[\d.]+(?:-[\w.]+)?$/u, '')
  const name = PACKAGES[framework]
  if (name === undefined) {
    throw new Error(`No package for ${fixture}`)
  }
  const dir = `${ROOT}test/frameworks/${fixture}`
  const under = `${dir}/node_modules/.under-test/${name}`
  await Bun.$`rm -rf ${under} && mkdir -p ${under} && cp -r ${ROOT}packages/${name}/src ${ROOT}packages/${name}/package.json ${under}/`.quiet()
  const tests = await Array.fromAsync(new Bun.Glob('src/**/*.test.js').scan({ cwd: under }))
  const run = Bun.spawn(
    [
      process.execPath,
      'test',
      '--preload',
      `${ROOT}test/dom.js`,
      '--conditions',
      'browser',
      '--conditions',
      'development',
      ...tests.map((file) => `./node_modules/.under-test/${name}/${file}`),
    ],
    { cwd: dir, stderr: 'pipe', stdout: 'pipe' },
  )
  const [code, out, err] = await Promise.all([
    run.exited,
    new Response(run.stdout).text(),
    new Response(run.stderr).text(),
  ])
  return { code, output: `${out}${err}` }
}

describe('each framework version a package supports', () => {
  for (const manifest of fixtures.toSorted()) {
    const fixture = manifest.replace(/\/package\.json$/u, '')
    test(
      `runs the package's tests against ${fixture}`,
      async () => {
        const { code, output } = await runIn(fixture)
        expect(code === 0 ? 'passed' : output).toBe('passed')
      },
      VERSION_MS,
    )
  }
})
