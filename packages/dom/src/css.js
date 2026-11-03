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
 * @param {Stylesheet} sheet - The stylesheet
 * @param {string} kind - The component's kind
 * @param {DomMode} mode - Where it lives
 * @returns {string} The scoped text
 */
function scopedText(sheet, kind, mode) {
  const root = mode === 'shadow' ? ':host' : `[${KIND_ATTRIBUTE}="${checkKind(kind)}"]`
  return `@scope (${root}) to ([${KIND_ATTRIBUTE}]) {\n${sheet.text}\n}\n`
}

export { KIND_ATTRIBUTE, checkKind, css, scopedText }
