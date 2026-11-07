/**
 * The comments that mark holes, in rendered markup and on the server alike, so hydration finds them where the DOM
 * renderer would have put them.
 */

/** Before an element with attribute, property or event holes. */
const ELEMENT = 'i@'
/** Starts a child hole's content, or one item of a `repeat`. */
const OPEN = 'i['
/** Ends what `OPEN` started. */
const CLOSE = 'i]'

const OPEN_MARKUP = `<!--${OPEN}-->`
const CLOSE_MARKUP = `<!--${CLOSE}-->`
const ELEMENT_MARKUP = `<!--${ELEMENT}-->`

/**
 * Whether a node is one of the markers.
 * @param {Node | null} node - Any node
 * @param {string} which - `ELEMENT`, `OPEN` or `CLOSE`
 * @returns {node is Comment} Whether it is that marker
 */
function isMarker(node, which) {
  return node instanceof Comment && node.data === which
}

/**
 * The `CLOSE` that ends what an `OPEN` starts, past any pairs nested inside.
 * @param {Comment} open - An `OPEN` marker
 * @returns {Comment} Its `CLOSE`
 */
function matchingClose(open) {
  let depth = 1
  for (let node = open.nextSibling; node; node = node.nextSibling) {
    if (isMarker(node, OPEN)) {
      depth += 1
    } else if (isMarker(node, CLOSE)) {
      depth -= 1
      if (depth === 0) {
        return node
      }
    }
  }
  throw new Error('A hole marker is never closed: the markup was changed after it was rendered')
}

export { CLOSE, CLOSE_MARKUP, ELEMENT, ELEMENT_MARKUP, OPEN, OPEN_MARKUP, isMarker, matchingClose }
