/**
 * @import { Behavior, View } from './component.js'
 * @import { DomMode } from './css.js'
 */

import { STYLES_ATTRIBUTE } from './adopt.js'
import { KIND_ATTRIBUTE, VIEW_ATTRIBUTE, checkKind, scopedText } from './css.js'
import { escapeAttribute } from './escape.js'
import { renderToString } from './render-string.js'

/**
 * Where a shadow-mode instance's stylesheet comes from on the server: a URL every instance links to, which the browser
 * fetches once and holds the first frame for, or the text inlined in each instance.
 * @typedef {Readonly<{ href: string }> | 'inline'} ServerStyles
 */

/**
 * How to render a component on the server: the app's tag prefix, the instance's DOM mode, and, for shadow DOM, where
 * its stylesheet comes from.
 * @typedef {Readonly<{ prefix: string, mode: DomMode, styles?: ServerStyles }>} ServerRendering
 */

/**
 * A component's stylesheet scoped for one DOM mode, to serve at the URL shadow instances link to, or once in the page
 * for light-DOM instances, in a `<link>` or `<style>` with `stylesheetAttributes`.
 * @template {Behavior} B
 * @param {View<B>} view - The component's view
 * @param {DomMode} mode - Where its instances live
 * @returns {string} The scoped stylesheet
 */
function stylesheetText(view, mode) {
  return scopedText(view.styles, view.kind, mode)
}

/**
 * The attribute to put on a page's `<link>` or `<style>` holding light-DOM stylesheets, naming the kinds it styles, so
 * instances use it instead of adopting the same rules again.
 * @param {readonly string[]} kinds - The components' kinds
 * @returns {string} The attribute, as markup
 */
function stylesheetAttributes(kinds) {
  return `${STYLES_ATTRIBUTE}="${escapeAttribute(kinds.map((kind) => checkKind(kind)).join(' '))}"`
}

/**
 * The stylesheet markup inside a shadow-mode instance.
 * @template {Behavior} B
 * @param {View<B>} view - The component's view
 * @param {ServerStyles | undefined} styles - Where it comes from
 * @returns {string} A `<link>` or a `<style>`
 */
function shadowStyles(view, styles) {
  if (styles === undefined) {
    throw new TypeError('Rendering a shadow-DOM component on the server needs styles: { href } or "inline"')
  }
  const marked = `${STYLES_ATTRIBUTE}="${view.kind}"`
  if (styles !== 'inline') {
    return `<link rel="stylesheet" href="${escapeAttribute(styles.href)}" ${marked}>`
  }
  const text = stylesheetText(view, 'shadow')
  if (/<\/style/iu.test(text)) {
    throw new Error(`The ${view.kind} stylesheet contains "</style", which can't be inlined`)
  }
  return `<style ${marked}>${text}</style>`
}

/**
 * A component instance as server markup, which the registered element adopts when it upgrades. In shadow DOM the view
 * goes in a declarative shadow root with its stylesheet; in light DOM it goes in the element, and the page holds the
 * stylesheet once (`stylesheetText`).
 * @template {Behavior} B
 * @param {View<B>} view - The component's view
 * @param {B} behavior - The instance's behavior, in the state to render
 * @param {ServerRendering} rendering - How to render it
 * @returns {string} The markup
 */
function renderComponent(view, behavior, rendering) {
  const tag = `${checkKind(rendering.prefix)}-${checkKind(view.kind)}`
  const content = renderToString(view.render(behavior))
  if (rendering.mode === 'light') {
    return `<${tag} ${KIND_ATTRIBUTE}="${view.kind}" dom-mode="light">${content}</${tag}>`
  }
  const styles = shadowStyles(view, rendering.styles)
  const inner = `<div ${VIEW_ATTRIBUTE} style="display: contents">${content}</div>`
  return `<${tag} ${KIND_ATTRIBUTE}="${view.kind}"><template shadowrootmode="open">${styles}${inner}</template></${tag}>`
}

export { renderComponent, stylesheetAttributes, stylesheetText }
