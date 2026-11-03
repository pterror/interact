/** @import { TemplateResult } from './template.js' */

import { ChildPart } from './child-part.js'
import { CLOSE, OPEN, isMarker, matchingClose } from './markers.js'

/**
 * Where a template can be rendered: an element, a shadow root or a fragment.
 * @typedef {Element | DocumentFragment} Container
 */

/** @type {WeakMap<Container, ChildPart>} */
const roots = new WeakMap()

/**
 * Renders a template into a container, after anything already in it. Rendering into the same container again updates
 * what is there.
 * @param {TemplateResult} result - The template and its values
 * @param {Container} container - Where it goes
 * @returns {void}
 */
function render(result, container) {
  let root = roots.get(container)
  if (!root) {
    const document = container.ownerDocument
    const range = { close: document.createComment(CLOSE), open: document.createComment(OPEN) }
    container.append(range.open, range.close)
    root = new ChildPart(range, false)
    roots.set(container, root)
  }
  root.set(result)
}

/**
 * Adopts server markup in a container (from `renderToString`) for a template: its nodes stay, and later `render`
 * calls update them. Throws if the markup isn't there, or was rendered from a different template.
 * @param {TemplateResult} result - The template and its values, as the server rendered them
 * @param {Container} container - Where the server markup is
 * @returns {void}
 */
function hydrate(result, container) {
  const open = [...container.childNodes].find((node) => isMarker(node, OPEN))
  if (!(open instanceof Comment)) {
    throw new TypeError('There is no server markup to hydrate here')
  }
  const root = new ChildPart({ close: matchingClose(open), open }, true)
  roots.set(container, root)
  root.set(result)
}

/**
 * Whether a container holds server markup that `hydrate` can adopt.
 * @param {Container} container - The container
 * @returns {boolean} Whether it does
 */
function hasServerMarkup(container) {
  return !roots.has(container) && [...container.childNodes].some((node) => isMarker(node, OPEN))
}

export { hasServerMarkup, hydrate, render }
