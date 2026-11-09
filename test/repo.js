/**
 * What the repo's rule tests check: its packages' manifests and modules, and that they ship no stylesheet.
 */

const ROOT = new URL('..', import.meta.url).pathname

/**
 * A package's manifest: its npm name, what it depends on at runtime, and its `sideEffects` field as written
 * @typedef {Readonly<{ name: string, runtime: readonly string[], sideEffects: unknown }>} Manifest
 */

/**
 * Paths under the repo root that match a glob
 * @param {string} pattern - The glob, from the repo root
 * @returns {Promise<string[]>} The paths, from the repo root
 */
async function paths(pattern) {
  const found = await Array.fromAsync(new Bun.Glob(pattern).scan({ cwd: ROOT }))
  return found
}

/**
 * The names in one of a manifest's dependency fields
 * @param {unknown} field - The field's value
 * @returns {string[]} The dependencies' names
 */
function names(field) {
  if (typeof field !== 'object' || field === null) {
    return []
  }
  return Object.keys(field)
}

/**
 * A package's manifest
 * @param {string} file - Its package.json, from the repo root
 * @returns {Promise<Manifest>} What the manifest says
 */
async function manifest(file) {
  /** @type {unknown} */
  const raw = await Bun.file(`${ROOT}${file}`).json()
  if (typeof raw !== 'object' || raw === null || !('name' in raw) || typeof raw.name !== 'string') {
    throw new TypeError(`${file} has no name`)
  }
  return {
    name: raw.name,
    runtime: [
      ...names('dependencies' in raw ? raw.dependencies : undefined),
      ...names('peerDependencies' in raw ? raw.peerDependencies : undefined),
      ...names('optionalDependencies' in raw ? raw.optionalDependencies : undefined),
    ],
    sideEffects: 'sideEffects' in raw ? raw.sideEffects : undefined,
  }
}

/**
 * Every package's manifest
 * @returns {Promise<Manifest[]>} One per package
 */
async function manifests() {
  const files = await paths('packages/*/package.json')
  const all = await Promise.all(files.map(async (file) => manifest(file)))
  return all
}

/**
 * Runtime dependencies on anything outside this repo
 * @param {readonly Manifest[]} all - Every package's manifest
 * @returns {string[]} Each as "package -> dependency"
 */
function outsideDependencies(all) {
  const ours = new Set(all.map(({ name }) => name))
  return all.flatMap(({ name, runtime }) => runtime.filter((dep) => !ours.has(dep)).map((dep) => `${name} -> ${dep}`))
}

/**
 * Packages whose `sideEffects` isn't false: importing any of their modules may do something
 * @param {readonly Manifest[]} all - Every package's manifest
 * @returns {string[]} Their names
 */
function withSideEffects(all) {
  return all.filter(({ sideEffects }) => sideEffects !== false).map(({ name }) => name)
}

/**
 * Every file in the packages, their dependencies aside
 * @returns {Promise<string[]>} Their paths, from the repo root
 */
async function packageFiles() {
  const all = await paths('packages/**/*')
  return all.filter((path) => !path.includes('/node_modules/'))
}

/**
 * The stylesheets among some files
 * @param {readonly string[]} files - The files, from the repo root
 * @returns {string[]} Those that are .css
 */
function stylesheetFiles(files) {
  return files.filter((path) => path.endsWith('.css'))
}

/** @type {readonly Readonly<{ pattern: RegExp, what: string }>[]} */
const STYLES = [
  { pattern: /\bCSSStyleSheet\b/u, what: 'a constructed stylesheet' },
  { pattern: /\badoptedStyleSheets\b/u, what: 'adopted stylesheets' },
  { pattern: /\binsertRule\s*\(/u, what: 'an inserted rule' },
  { pattern: /createElement\(\s*['"`]style['"`]\s*\)/u, what: 'a style element' },
  { pattern: /<style[\s>]/u, what: 'a style element' },
  { pattern: /(?:from|import)\s*\(?\s*['"`][^'"`]*\.css['"`]/u, what: 'an imported stylesheet' },
]

/**
 * Ways some JavaScript carries CSS of its own (inline geometry, set property by property, is behaviour, not this)
 * @param {string} text - The JavaScript
 * @returns {string[]} What each is
 */
function stylesIn(text) {
  return [...new Set(STYLES.filter(({ pattern }) => pattern.test(text)).map(({ what }) => what))]
}

/**
 * The modules the packages ship: their sources, tests and test helpers aside
 * @returns {Promise<string[]>} Their paths, from the repo root
 */
async function shippedModules() {
  const all = await paths('packages/*/src/**/*.js')
  return all.filter((path) => !path.endsWith('.test.js') && !/(?:^|\/)test-[^/]*\.js$/u.test(path))
}

/**
 * CSS the packages ship: stylesheet files, and CSS in their modules
 * @returns {Promise<string[]>} Each as a path, or "path: what"
 */
async function shippedStyles() {
  const [files, modules] = await Promise.all([packageFiles(), shippedModules()])
  const inModules = await Promise.all(
    modules.map(async (path) => stylesIn(await Bun.file(`${ROOT}${path}`).text()).map((what) => `${path}: ${what}`)),
  )
  return [...stylesheetFiles(files), ...inModules.flat()]
}

/**
 * Imports one module, for what importing it does
 * @param {string} path - Absolute
 * @returns {Promise<void>} When it has loaded
 */
async function load(path) {
  await import(path)
}

/**
 * Imports every module the packages ship
 * @returns {Promise<void>} When all have loaded
 */
async function importEveryModule() {
  const modules = await shippedModules()
  await Promise.all(modules.map(async (path) => load(`${ROOT}${path}`)))
}

/** @type {readonly Readonly<{ pattern: RegExp, what: string }>[]} */
const ESCAPES = [
  { pattern: /\/\*\*\s*@type\s*\{[^}]*\}\s*\*\/\s*\(/u, what: 'a JSDoc cast' },
  { pattern: /@ts-(?:ignore|expect-error|nocheck)\b/u, what: 'a @ts- directive' },
  {
    pattern:
      /@(?:type|param|returns?|typedef|property|template|satisfies)\s*\{(?:[ \t]*\*[ \t]*\}|[^}]*?(?:\bany\b|[<,|(][ \t]*\*[ \t]*[>,|)]))/u,
    what: 'any',
  },
]

/**
 * Ways some JavaScript gets around its types
 * @param {string} text - The JavaScript
 * @returns {string[]} What each is
 */
function escapes(text) {
  return ESCAPES.filter(({ pattern }) => pattern.test(text)).map(({ what }) => what)
}

/**
 * Ways a module gets around its types
 * @param {string} path - The module, from the repo root
 * @returns {Promise<string[]>} Each as "path: what"
 */
async function escapesIn(path) {
  const text = await Bun.file(`${ROOT}${path}`).text()
  return escapes(text).map((what) => `${path}: ${what}`)
}

/**
 * Every JavaScript file the rules check: the packages' sources, the repo's tests and its scripts. One glob each, as Bun's globs
 * match nothing for a brace around a path with `**` after it
 * @returns {Promise<string[]>} Their paths, from the repo root
 */
async function javascriptFiles() {
  const [sources, tests, scripts] = await Promise.all([
    paths('packages/*/src/**/*.js'),
    paths('test/**/*.js'),
    paths('scripts/**/*.js'),
  ])
  return [...sources, ...tests, ...scripts]
}

/**
 * Casts, `@ts-` directives and `any` in the repo's JavaScript
 * @returns {Promise<string[]>} Each as "path: what"
 */
async function typeEscapes() {
  const all = await javascriptFiles()
  const found = await Promise.all(all.map(async (path) => escapesIn(path)))
  return found.flat()
}

/**
 * Packages whose README names a license other than their manifest's
 * @returns {Promise<string[]>} Each as "package: README says X, package.json Y"
 */
async function licenseMismatches() {
  const files = await paths('packages/*/package.json')
  const found = await Promise.all(
    files.map(async (file) => {
      /** @type {unknown} */
      const raw = await Bun.file(`${ROOT}${file}`).json()
      const license = typeof raw === 'object' && raw !== null && 'license' in raw ? String(raw.license) : undefined
      const readme = Bun.file(`${ROOT}${file.replace(/package\.json$/u, 'README.md')}`)
      const exists = await readme.exists()
      const text = exists ? await readme.text() : ''
      const said = /^## License\s*\n\s*\n(?<said>[^\n]+)/mu.exec(text)?.groups?.['said']?.trim()
      return said === undefined || said === license
        ? []
        : [`${file}: README says ${said}, package.json ${String(license)}`]
    }),
  )
  return found.flat()
}

export {
  escapes,
  importEveryModule,
  javascriptFiles,
  licenseMismatches,
  manifests,
  outsideDependencies,
  packageFiles,
  paths,
  shippedModules,
  shippedStyles,
  stylesIn,
  stylesheetFiles,
  typeEscapes,
  withSideEffects,
}
