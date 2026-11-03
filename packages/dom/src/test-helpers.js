/**
 * @import { Range } from './collect.js'
 * @import { Part } from './instance.js'
 * @import { TemplateResult } from './template.js'
 */

import { ChildPart } from './child-part.js'
import { CLOSE, OPEN, isMarker } from './markers.js'
import { renderToString } from './render-string.js'

/**
 * A container holding a template's server markup.
 * @param {TemplateResult} result - The template
 * @returns {HTMLDivElement} The container
 */
function serverMarkup(result) {
  const container = document.createElement('div')
  container.innerHTML = renderToString(result)
  return container
}

/**
 * The markers around a container's content, which must start and end with them.
 * @param {Element} container - The container
 * @returns {Range} Its first and last nodes
 */
function outerRange(container) {
  const { firstChild: open, lastChild: close } = container
  if (!isMarker(open, OPEN) || !isMarker(close, CLOSE)) {
    throw new Error('The container does not start and end with markers')
  }
  return { close, open }
}

/**
 * An empty child hole at the end of a new container.
 * @returns {Readonly<{ container: HTMLDivElement, range: Range }>} The container and the hole's markers
 */
function emptyHole() {
  const container = document.createElement('div')
  const range = { close: document.createComment(CLOSE), open: document.createComment(OPEN) }
  container.append(range.open, range.close)
  return { container, range }
}

/**
 * Makes real child parts, as rendering does.
 * @param {Range} range - The hole's markers
 * @param {boolean} adopting - Whether to adopt server markup
 * @returns {Part} The part
 */
function childParts(range, adopting) {
  return new ChildPart(range, adopting)
}

/**
 * Makes child parts that ignore their values, to test something without them.
 * @returns {Part} A part that does nothing
 */
function noChildren() {
  return { set: () => undefined }
}

/**
 * An element found by a selector, which must be there.
 * @param {Element | DocumentFragment} root - Where to look
 * @param {string} selector - What to look for
 * @returns {HTMLElement} The element
 */
function find(root, selector) {
  const found = root.querySelector(selector)
  if (!(found instanceof HTMLElement)) {
    throw new TypeError(`Nothing matches ${selector}`)
  }
  return found
}

/**
 * A container's first node, which must be an `OPEN` marker.
 * @param {Element} container - The container
 * @returns {Comment} The marker
 */
function firstOpen(container) {
  const { firstChild } = container
  if (!isMarker(firstChild, OPEN)) {
    throw new Error('The container does not start with an open marker')
  }
  return firstChild
}

/**
 * A container's last node, which must be there.
 * @param {Element} container - The container
 * @returns {ChildNode} The node
 */
function lastNode(container) {
  const { lastChild } = container
  if (!lastChild) {
    throw new Error('The container is empty')
  }
  return lastChild
}

/**
 * Starts noting every node added to or removed from a container's children.
 * @param {Element} container - The container
 * @returns {() => Node[]} Stops, and gives the nodes noted
 */
function watchChildren(container) {
  const observer = new MutationObserver(() => undefined)
  observer.observe(container, { childList: true })
  return () => {
    const records = observer.takeRecords()
    observer.disconnect()
    /** @type {Node[]} */
    const nodes = []
    for (const record of records) {
      nodes.push(...record.addedNodes, ...record.removedNodes)
    }
    return nodes
  }
}

export { watchChildren, childParts, emptyHole, find, firstOpen, lastNode, noChildren, outerRange, serverMarkup }
