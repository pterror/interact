/**
 * A component's stylesheet, as written: the same text in shadow and light DOM.
 * @typedef {Readonly<{ kind: 'stylesheet', text: string }>} Stylesheet
 */

/**
 * Whether a component lives in its own shadow root, or in the light DOM among the page's elements.
 * @typedef {'shadow' | 'light'} DomMode
 */

/** The attribute every component carries, naming its kind, so styles and code never depend on tag names. */
const KIND_ATTRIBUTE = 'data-interact'
/** The attribute on the element a shadow-DOM component's view is rendered in, the one child of its shadow root. */
const VIEW_ATTRIBUTE = 'data-interact-view'
const KIND = /^[a-z][a-z0-9-]*$/u
const NONE = 0

/**
 * A stylesheet. It takes no holes, so what it says can be checked where it is written; values that change are custom
 * properties. The host is `:scope`, in both DOM modes.
 * @param {TemplateStringsArray} strings - The stylesheet's text
 * @param {readonly never[]} holes - None
 * @returns {Stylesheet} The stylesheet
 */
function css(strings, ...holes) {
  if (holes.length !== NONE) {
    throw new TypeError('css`` takes no holes: use custom properties for values that change')
  }
  return { kind: 'stylesheet', text: strings.raw.join('') }
}

/**
 * Stylesheets joined into one, in order, for a view made of parts that each bring their own (a menu's list and its
 * overlay).
 * @param {readonly Stylesheet[]} sheets - The stylesheets
 * @returns {Stylesheet} One stylesheet holding them all
 */
function joinStyles(...sheets) {
  return { kind: 'stylesheet', text: sheets.map((sheet) => sheet.text).join('\n') }
}

/**
 * Fails unless a kind is a lowercase name, safe in a selector and a tag name.
 * @param {string} kind - A component's kind
 * @returns {string} The kind
 */
function checkKind(kind) {
  if (!KIND.test(kind)) {
    throw new TypeError(
      `A component's kind is lowercase letters, digits and hyphens, starting with a letter: "${kind}"`,
    )
  }
  return kind
}

/**
 * A stylesheet's text scoped to one component: to the shadow host in shadow DOM, and to elements of its kind in light
 * DOM. Either way the scope stops at any component inside it, which styles itself.
 *
 * Firefox 157 drops every element below the host from `@scope (:host) to (...)` (Mozilla bug 2023867), and no engine
 * matches a scope root with a selector that doesn't name `:scope`. So shadow DOM gets two scopes: the host alone, and
 * the element the view is rendered in, stopping at components inside, where the host is `:host`.
 * @param {Stylesheet} sheet - The stylesheet
 * @param {string} kind - The component's kind
 * @param {DomMode} mode - Where it lives
 * @returns {string} The scoped text
 */
function scopedText(sheet, kind, mode) {
  const limit = `to ([${KIND_ATTRIBUTE}])`
  if (mode === 'light') {
    return `@scope ([${KIND_ATTRIBUTE}="${checkKind(kind)}"]) ${limit} {\n${sheet.text}\n}\n`
  }
  const below = sheet.text.replaceAll(/:scope(?![\w-])/gu, ':host')
  const view = `[${VIEW_ATTRIBUTE}]`
  return `@scope (:host) to (${view}) {\n${sheet.text}\n}\n@scope (:host > ${view}) ${limit} {\n${below}\n}\n`
}

export { KIND_ATTRIBUTE, VIEW_ATTRIBUTE, checkKind, css, joinStyles, scopedText }
