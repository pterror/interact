/**
 * Visits the nodes of a syntax tree that touch a range, depth first, including the trees mounted over parts of a node
 * (an overlay, as HTML tags are mounted over a paragraph). A plain cursor doesn't enter overlays. An overlay's nodes
 * are visited after the host's own children.
 */

import { NodeProp } from '@lezer/common'

/**
 * @typedef {import('@lezer/common').SyntaxNode} SyntaxNode
 */

/**
 * The top node of an overlay mounted on a host, as a node with positions in the outer text
 * @param {SyntaxNode} host - The node it is mounted on
 * @param {number} at - A position the overlay covers
 * @returns {SyntaxNode | undefined} Its top node
 */
function overlayTop(host, at) {
  for (let node = host.enter(at, 1); node !== null; node = node.parent) {
    const parent = node.parent
    if (parent !== null && parent.from === host.from && parent.to === host.to && parent.type === host.type) {
      return node
    }
  }
  return undefined
}

/**
 * Visits each node touching `from`..`to` under a node, the node itself included
 * @param {SyntaxNode} top - Where to start
 * @param {number} from - The range's start
 * @param {number} to - Its end
 * @param {(node: SyntaxNode) => boolean} visit - Called for each node; false skips its children
 * @returns {void}
 */
function walk(top, from, to, visit) {
  if (top.to < from || top.from > to || !visit(top)) {
    return
  }
  for (let child = top.firstChild; child !== null && child.from <= to; child = child.nextSibling) {
    walk(child, from, to, visit)
  }
  const overlay = top.tree?.prop(NodeProp.mounted)?.overlay
  const first = overlay?.[0]
  if (first === undefined) {
    return
  }
  const inner = overlayTop(top, top.from + first.from)
  if (inner === undefined) {
    return
  }
  for (let child = inner.firstChild; child !== null && child.from <= to; child = child.nextSibling) {
    walk(child, from, to, visit)
  }
}

export { walk }
