/**
 * What the repo's rule tests check: its packages' manifests, modules and stylesheets.
 */

const ROOT = new URL('..', import.meta.url).pathname
const FENCE_PREFIX = 'packages/keybinds/'

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
 * Whether a value is a string
 * @param {unknown} value - Anything
 * @returns {value is string} Whether it is a string
 */
function isString(value) {
  return typeof value === 'string'
}

/**
 * The files not yet under the repo's rules: the keybinds entries in `.oxlintrc.json`'s ignorePatterns, its one list
 * @returns {Promise<ReadonlySet<string>>} Their paths, from the repo root
 */
async function fence() {
  /** @type {unknown} */
  const config = Bun.JSONC.parse(await Bun.file(`${ROOT}.oxlintrc.json`).text())
  if (typeof config !== 'object' || config === null || !('ignorePatterns' in config)) {
    throw new TypeError('.oxlintrc.json has no ignorePatterns')
  }
  const { ignorePatterns } = config
  if (!Array.isArray(ignorePatterns)) {
    throw new TypeError('.oxlintrc.json ignorePatterns is not a list')
  }
  /** @type {unknown[]} */
  const patterns = ignorePatterns
  return new Set(patterns.filter((pattern) => isString(pattern)).filter((pattern) => pattern.startsWith(FENCE_PREFIX)))
}

/**
 * Leaves out what is still fenced
 * @param {readonly string[]} all - Paths from the repo root
 * @returns {Promise<string[]>} Those under the repo's rules
 */
async function unfenced(all) {
  const fenced = await fence()
  return all.filter((path) => !fenced.has(path))
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
 * Whether a `sideEffects` field says only stylesheets have side effects
 * @param {unknown} sideEffects - The field's value
 * @returns {boolean} Whether it is false, or lists only .css files
 */
function onlyStylesheets(sideEffects) {
  return (
    sideEffects === false ||
    (Array.isArray(sideEffects) && sideEffects.every((entry) => typeof entry === 'string' && entry.endsWith('.css')))
  )
}

/**
 * Packages whose `sideEffects` allows anything but stylesheets
 * @param {readonly Manifest[]} all - Every package's manifest
 * @returns {string[]} Their names
 */
function sideEffectsBeyondStylesheets(all) {
  return all.filter(({ sideEffects }) => !onlyStylesheets(sideEffects)).map(({ name }) => name)
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
 * Imports every module in the packages' sources, tests and their helpers aside
 * @returns {Promise<void>} When all have loaded
 */
async function importEveryModule() {
  const all = await paths('packages/*/src/**/*.js')
  const modules = all.filter((path) => !path.endsWith('.test.js') && !path.endsWith('/test-helpers.js'))
  await Promise.all(modules.map(async (path) => load(`${ROOT}${path}`)))
}

/** @type {readonly Readonly<{ pattern: RegExp, what: string }>[]} */
const ESCAPES = [
  { pattern: /\/\*\*\s*@type\s*\{[^}]*\}\s*\*\/\s*\(/u, what: 'a JSDoc cast' },
  { pattern: /@ts-(?:ignore|expect-error|nocheck)\b/u, what: 'a @ts- directive' },
  { pattern: /@(?:type|param|returns?|typedef|property|template|satisfies)\s*\{[^}]*(?:\bany\b|\*)/u, what: 'any' },
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
 * Casts, `@ts-` directives and `any` in the repo's JavaScript
 * @returns {Promise<string[]>} Each as "path: what"
 */
async function typeEscapes() {
  const all = await paths('{packages/*/src,test}/**/*.js')
  const checked = await unfenced(all)
  const found = await Promise.all(checked.map(async (path) => escapesIn(path)))
  return found.flat()
}

export {
  escapes,
  unfenced,
  paths,
  importEveryModule,
  manifests,
  outsideDependencies,
  sideEffectsBeyondStylesheets,
  typeEscapes,
}
