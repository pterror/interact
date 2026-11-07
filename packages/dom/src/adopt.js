/** @import { DomMode, Stylesheet } from './css.js' */

import { scopedText } from './css.js'

/** The attribute on a stylesheet's `<link>` or `<style>` from the server, naming the kinds it styles. */
const STYLES_ATTRIBUTE = 'data-interact-styles'

/** @type {WeakMap<Stylesheet, Map<string, CSSStyleSheet>>} */
const constructed = new WeakMap()

/**
 * A stylesheet scoped to one component, constructed once and shared by every root that adopts it.
 * @param {Stylesheet} sheet - The stylesheet
 * @param {string} kind - The component's kind
 * @param {DomMode} mode - Where it lives
 * @returns {CSSStyleSheet} The constructed sheet
 */
function constructedSheet(sheet, kind, mode) {
  /** @type {Map<string, CSSStyleSheet>} */
  const empty = new Map()
  const byScope = constructed.get(sheet) ?? empty
  constructed.set(sheet, byScope)
  const key = `${mode} ${kind}`
  const known = byScope.get(key)
  if (known) {
    return known
  }
  const fresh = new CSSStyleSheet()
  fresh.replaceSync(scopedText(sheet, kind, mode))
  byScope.set(key, fresh)
  return fresh
}

/**
 * Whether a root already has a stylesheet from the server for a kind.
 * @param {Document | ShadowRoot} root - The document or shadow root
 * @param {string} kind - The component's kind
 * @returns {boolean} Whether it does
 */
function hasServerStyles(root, kind) {
  return [...root.querySelectorAll(`[${STYLES_ATTRIBUTE}]`)].some((element) =>
    (element.getAttribute(STYLES_ATTRIBUTE) ?? '').split(' ').includes(kind),
  )
}

/**
 * Styles a component. In shadow DOM its shadow root adopts the shadow-scoped sheet, and any stylesheet the server put
 * in that root is removed, so the rules have one source. In light DOM the document or shadow root it is in adopts the
 * light-scoped sheet once, unless the server already put that sheet in the page.
 * @param {Document | ShadowRoot} root - The shadow root (shadow DOM) or the root the component is in (light DOM)
 * @param {Stylesheet} sheet - The component's stylesheet
 * @param {Readonly<{ kind: string, mode: DomMode }>} scope - Its kind, and where it lives
 * @returns {void}
 */
function adoptStyles(root, sheet, scope) {
  const { kind, mode } = scope
  if (mode === 'light' && hasServerStyles(root, kind)) {
    return
  }
  const adopted = constructedSheet(sheet, kind, mode)
  if (!root.adoptedStyleSheets.includes(adopted)) {
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, adopted]
  }
  if (mode === 'shadow') {
    for (const element of [...root.children].filter((child) => child.hasAttribute(STYLES_ATTRIBUTE))) {
      element.remove()
    }
  }
}

export { STYLES_ATTRIBUTE, adoptStyles }
