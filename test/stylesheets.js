/**
 * The repo's rule for styles, as the rule tests check it: every selector has zero specificity and sits in a cascade
 * layer, in stylesheets and in modules' css templates alike.
 */

import { paths } from './repo.js'

const ROOT = new URL('..', import.meta.url).pathname
const OPEN = '('
const CLOSE = ')'
const OUTSIDE = 0
const DEEPER = 1
const SHALLOWER = -1

/**
 * A style rule: its selector list as written, and whether it sits inside an `@layer` block
 * @typedef {Readonly<{ layered: boolean, selector: string }>} StyleRule
 */

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

const CSS_TEMPLATE = /\bcss`(?<text>[^`]*)`/gu
const COMMA = ','

/**
 * The selectors in a selector list: split at its own commas, not those inside `:where(...)` or any other parentheses
 * @param {string} list - The selector list
 * @returns {string[]} Each selector, trimmed
 */
function selectorsOf(list) {
  /** @type {string[]} */
  const selectors = []
  let depth = OUTSIDE
  let start = OUTSIDE
  for (let index = OUTSIDE; index < list.length; index += COMMA.length) {
    const char = list.charAt(index)
    depth += depthChange(char)
    if (char === COMMA && depth === OUTSIDE) {
      selectors.push(list.slice(start, index).trim())
      start = index + COMMA.length
    }
  }
  return [...selectors, list.slice(start).trim()]
}

/**
 * Selectors in some CSS that have specificity or sit outside a cascade layer
 * @param {string} where - Where the CSS is, for the report
 * @param {string} text - The CSS
 * @returns {string[]} Each as "where: selector"
 */
function cssViolations(where, text) {
  return styleRules(text).flatMap(({ layered, selector }) =>
    selectorsOf(selector)
      .filter((part) => !layered || !zeroSpecificity(part))
      .map((part) => `${where}: ${part}`),
  )
}

/**
 * The stylesheets a module writes in css templates
 * @param {string} source - The module
 * @returns {string[]} Each template's text
 */
function cssTemplates(source) {
  return [...source.matchAll(CSS_TEMPLATE)].map((match) => match.groups?.['text'] ?? '')
}

/**
 * Selectors in a file that have specificity or sit outside a cascade layer: a stylesheet, or a module's css templates
 * @param {string} path - The file, from the repo root
 * @returns {Promise<string[]>} Each as "path: selector"
 */
async function fileViolations(path) {
  const text = await Bun.file(`${ROOT}${path}`).text()
  if (path.endsWith('.css')) {
    return cssViolations(path, text)
  }
  return cssTemplates(text).flatMap((sheet) => cssViolations(`${path} (css template)`, sheet))
}

/**
 * Every file whose styles the rule checks: the packages' stylesheets, and their modules (tests aside) for css
 * templates. One glob
 * each, as Bun's globs match nothing for a brace around a path with `**` after it
 * @returns {Promise<string[]>} Their paths, from the repo root
 */
async function styledFiles() {
  const [sheets, modules] = await Promise.all([paths('packages/**/*.css'), paths('packages/*/src/**/*.js')])
  return [...sheets, ...modules].filter((path) => !path.includes('/node_modules/') && !path.endsWith('.test.js'))
}

/**
 * Selectors anywhere in the packages, in stylesheets or css templates, that have specificity or sit outside a
 * cascade layer
 * @returns {Promise<string[]>} Each as "path: selector"
 */
async function stylesheetViolations() {
  const files = await styledFiles()
  const found = await Promise.all(files.map(async (path) => fileViolations(path)))
  return found.flat()
}

export { cssTemplates, selectorsOf, styleRules, styledFiles, stylesheetViolations, zeroSpecificity }
