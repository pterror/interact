/** @import { Range } from './collect.js' */

/**
 * The nodes from a range's `OPEN` to its `CLOSE`, both included.
 * @param {Range} range - The range
 * @returns {ChildNode[]} The nodes, in order
 */
function nodesOf(range) {
  /** @type {ChildNode[]} */
  const nodes = []
  /** @type {ChildNode | null} */
  let node = range.open
  while (node) {
    nodes.push(node)
    if (node === range.close) {
      return nodes
    }
    node = node.nextSibling
  }
  throw new Error('A range ends outside its parent')
}

/**
 * Removes what is between a range's markers, keeping the markers.
 * @param {Range} range - The range
 * @returns {void}
 */
function clearRange(range) {
  while (range.open.nextSibling && range.open.nextSibling !== range.close) {
    range.open.nextSibling.remove()
  }
}

/**
 * Removes a range, markers and all.
 * @param {Range} range - The range
 * @returns {void}
 */
function removeRange(range) {
  for (const node of nodesOf(range)) {
    node.remove()
  }
}

/**
 * Moves a range, markers and all, to just after a node.
 * @param {ChildNode} cursor - The node it goes after
 * @param {Range} range - The range
 * @returns {void}
 */
function moveAfter(cursor, range) {
  cursor.after(...nodesOf(range))
}

export { clearRange, moveAfter, removeRange }
