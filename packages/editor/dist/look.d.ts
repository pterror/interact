/**
 * How each syntax node is drawn, looked up the same way by the editor and the reader. A Look maps a selector to a Rule,
 * or to a function giving the Rule for one node. A selector is a node name, or `Parent/Name` for a node directly inside
 * a parent of that name, which wins over the plain name.
 */
export type Surface = 'editor' | 'reader';
export type Read = (from: number, to: number) => string;
export type SyntaxNode = import('@lezer/common').SyntaxNode;
export type Piece = Readonly<{
    same: (other: Piece) => boolean;
    draw: () => HTMLElement;
    drop?: (element: HTMLElement) => void;
}>;
export type Rule = Readonly<{
    element?: string;
    class?: string;
    attributes?: (node: SyntaxNode, read: Read) => Readonly<Record<string, string>>;
    block?: boolean;
    mark?: boolean;
    piece?: (node: SyntaxNode, read: Read, surface: Surface) => Piece | undefined;
    source?: 'replaced' | 'beside';
    only?: Surface;
}>;
export type Look = Readonly<Record<string, Rule | ((node: SyntaxNode, read: Read) => Rule | undefined)>>;
/**
 * Where something is drawn
 * @typedef {'editor' | 'reader'} Surface
 */
/**
 * The source between two positions of the text being drawn
 * @typedef {(from: number, to: number) => string} Read
 */
/**
 * A node of the syntax tree: its name, its range in the text, and the nodes around it
 * @typedef {import('@lezer/common').SyntaxNode} SyntaxNode
 */
/**
 * Something drawn for a node instead of, or after, its source. `same` says whether another piece draws the same, so an
 * unchanged piece keeps its element. A piece whose content changes later keeps its own element up to date; `drop` is
 * called when its element is no longer drawn.
 * @typedef {Readonly<{
 *   same: (other: Piece) => boolean,
 *   draw: () => HTMLElement,
 *   drop?: (element: HTMLElement) => void,
 * }>} Piece
 */
/**
 * How a node is drawn.
 * - `element` and `class`: the element it is drawn as, and its classes; `attributes` gives the element's attributes.
 * - `block`: the element wraps whole lines.
 * - `mark`: a formatting mark. The editor draws it with `class`; the reader leaves it out.
 * - `piece`: a Piece for the node on a surface, or none to draw the node by its other fields. With `source` `replaced`
 *   the piece stands for the source on both surfaces, and in the editor Backspace deletes it whole. With `beside` the
 *   editor draws the source with `class` and the piece after it; the reader draws the piece alone.
 * - `only`: the one surface the rule applies on; on the other, the node is drawn as if it had no rule.
 * @typedef {Readonly<{
 *   element?: string,
 *   class?: string,
 *   attributes?: (node: SyntaxNode, read: Read) => Readonly<Record<string, string>>,
 *   block?: boolean,
 *   mark?: boolean,
 *   piece?: (node: SyntaxNode, read: Read, surface: Surface) => Piece | undefined,
 *   source?: 'replaced' | 'beside',
 *   only?: Surface,
 * }>} Rule
 */
/**
 * The selectors and their rules
 * @typedef {Readonly<Record<string, Rule | ((node: SyntaxNode, read: Read) => Rule | undefined)>>} Look
 */
/**
 * The rule a node is drawn by on a surface
 * @param {Look} look - The look
 * @param {SyntaxNode} node - The node
 * @param {Read} read - The source
 * @param {Surface} surface - Where it is drawn
 * @returns {Rule | undefined} Its rule, or none
 */
declare function ruleOf(look: Look, node: SyntaxNode, read: Read, surface: Surface): Rule | undefined;
export { ruleOf };
