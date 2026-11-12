/**
 * Visits the nodes of a syntax tree that touch a range, depth first, including the trees mounted over parts of a node
 * (an overlay, as HTML tags are mounted over a paragraph). A plain cursor doesn't enter overlays. An overlay's nodes
 * are visited after the host's own children.
 */
export type SyntaxNode = import('@lezer/common').SyntaxNode;
/**
 * Visits each node touching `from`..`to` under a node, the node itself included
 * @param {SyntaxNode} top - Where to start
 * @param {number} from - The range's start
 * @param {number} to - Its end
 * @param {(node: SyntaxNode) => boolean} visit - Called for each node; false skips its children
 * @returns {void}
 */
declare function walk(top: SyntaxNode, from: number, to: number, visit: (node: SyntaxNode) => boolean): void;
export { walk };
