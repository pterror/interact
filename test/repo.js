/**
 * What the repo's rule tests check: its packages' manifests, modules and stylesheets.
 */

const ROOT = new URL('..', import.meta.url).pathname

// The keybinds package predates these rules; packages/keybinds/TODO.md tracks bringing it under them.
const FENCED = 'packages/keybinds/'

const OPEN = '('
const CLOSE = ')'
const OUTSIDE = 0
const DEEPER = 1
const SHALLOWER = -1

/**
 * A package's manifest: its npm name, what it depends on at runtime, and its `sideEffects` field as written
 * @typedef {Readonly<{ name: string, runtime: readonly string[], sideEffects: unknown }>} Manifest
 */

/**
 * A style rule: its selector list as written, and whether it sits inside an `@layer` block
 * @typedef {Readonly<{ layered: boolean, selector: string }>} StyleRule
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
 * Whether a path is in code that predates the rules
 * @param {string} path - From the repo root
 * @returns {boolean} Whether the rules skip it
 */
function fenced(path) {
  return path.startsWith(FENCED)
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

/**
 * The CSS with comments removed and strings emptied, so braces in them don't count
 * @param {string} css - A stylesheet
 * @returns {string} The stylesheet's structure
 */
function strip(css) {
  return css.replaceAll(/\/\*[\s\S]*?\*\//gu, '').replaceAll(/"[^"]*"|'[^']*'/gu, '""')
}

/**
 * Whether a block's prelude opens a style rule, rather than an at-rule or a keyframe
 * @param {string} prelude - What precedes the block's `{`
 * @param {readonly string[]} open - The preludes of the blocks it is inside
 * @returns {boolean} Whether it is a style rule
 */
function isStyleRule(prelude, open) {
  return !prelude.startsWith('@') && !open.some((outer) => /^@(?:-\w+-)?keyframes\b/u.test(outer))
}

/**
 * Every style rule's selectors, nested ones too, with whether each sits inside an `@layer`
 * @param {string} css - A stylesheet
 * @returns {StyleRule[]} Its style rules, in order
 */
function styleRules(css) {
  /** @type {string[]} */
  const open = []
  /** @type {StyleRule[]} */
  const rules = []
  for (const token of strip(css).match(/[^{};]*[{};]/gu) ?? []) {
    const prelude = token.replace(/[{};]$/u, '').trim()
    if (token.endsWith('}')) {
      open.pop()
    } else if (token.endsWith('{')) {
      if (isStyleRule(prelude, open)) {
        rules.push({ layered: open.some((outer) => outer.startsWith('@layer')), selector: prelude })
      }
      open.push(prelude)
    }
  }
  return rules
}

/**
 * How a character changes the depth of parentheses
 * @param {string} char - One character
 * @returns {number} The change
 */
function depthChange(char) {
  if (char === OPEN) {
    return DEEPER
  }
  if (char === CLOSE) {
    return SHALLOWER
  }
  return OUTSIDE
}

/**
 * What follows the parenthesized group that starts at `start`
 * @param {string} text - Where the group is
 * @param {number} start - The index of its `(`
 * @returns {string} The text after its `)`, or all of `text` when it never closes
 */
function afterGroup(text, start) {
  let depth = OUTSIDE
  for (let index = start; index < text.length; index += CLOSE.length) {
    depth += depthChange(text.charAt(index))
    if (depth === OUTSIDE) {
      return text.slice(index + CLOSE.length)
    }
  }
  return text
}

/**
 * Whether a selector has no specificity: `:where(...)`, then at most a pseudo-element
 * @param {string} selector - One selector, not a list
 * @returns {boolean} Whether it has zero specificity
 */
function zeroSpecificity(selector) {
  const prefix = ':where'
  return (
    selector.startsWith(`${prefix}${OPEN}`) &&
    /^(?:::[\w-]+(?:\([^)]*\))?)?$/u.test(afterGroup(selector, prefix.length))
  )
}

/**
 * Selectors in a stylesheet that have specificity or sit outside a cascade layer
 * @param {string} path - The stylesheet, from the repo root
 * @returns {Promise<string[]>} Each as "path: selector"
 */
async function sheetViolations(path) {
  const rules = styleRules(await Bun.file(`${ROOT}${path}`).text())
  return rules.flatMap(({ layered, selector }) =>
    selector
      .split(',')
      .map((part) => part.trim())
      .filter((part) => !layered || !zeroSpecificity(part))
      .map((part) => `${path}: ${part}`),
  )
}

/**
 * Selectors anywhere in the packages that have specificity or sit outside a cascade layer
 * @returns {Promise<string[]>} Each as "path: selector"
 */
async function stylesheetViolations() {
  const all = await paths('packages/**/*.css')
  const sheets = all.filter((path) => !fenced(path) && !path.includes('/node_modules/'))
  const found = await Promise.all(sheets.map(async (path) => sheetViolations(path)))
  return found.flat()
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
  const found = await Promise.all(all.filter((path) => !fenced(path)).map(async (path) => escapesIn(path)))
  return found.flat()
}

export {
  escapes,
  importEveryModule,
  manifests,
  outsideDependencies,
  sideEffectsBeyondStylesheets,
  styleRules,
  stylesheetViolations,
  typeEscapes,
  zeroSpecificity,
}
