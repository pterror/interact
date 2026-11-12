/**
 * The editor's drawing of a Look: the elements, marks and pieces over the source text. What can't change the editor's
 * vertical layout is built for the visible ranges only, and rebuilt when the text, the viewport or the tree changes.
 * What can (block wrappers, and replaced pieces that cover a line break) can't come from a function of the view
 * (`EditorView.decorations`), so it is a state field: it moves through each change, and is rebuilt only for the
 * top-level nodes that are new or changed. Both are drawn again from scratch on `lookChanged`. While an IME composes,
 * the visible decorations only move with the text, since replacing them around the text being composed can break the
 * composition. A block wrapper wraps the lines that start in its range, so it starts where its node's line does: a
 * block nested on its parent's line (`> > quote`) starts after it.
 */
import { BlockWrapper, Decoration } from '@codemirror/view';
export type EditorState = import('@codemirror/state').EditorState;
export type Extension = import('@codemirror/state').Extension;
export type DecorationRange = import('@codemirror/state').Range<Decoration>;
export type DecorationSet = import('@codemirror/view').DecorationSet;
export type SyntaxNode = import('@lezer/common').SyntaxNode;
export type Look = import('./look.js').Look;
export type Piece = import('./look.js').Piece;
/**
 * @typedef {import('@codemirror/state').EditorState} EditorState
 * @typedef {import('@codemirror/state').Extension} Extension
 * @typedef {import('@codemirror/state').Range<Decoration>} DecorationRange
 * @typedef {import('@codemirror/view').DecorationSet} DecorationSet
 * @typedef {import('@lezer/common').SyntaxNode} SyntaxNode
 * @typedef {import('./look.js').Look} Look
 * @typedef {import('./look.js').Piece} Piece
 */
/**
 * Says that what a Look draws changed without the text changing (a macro's value arrived, macros are shown as
 * written), so everything it draws is drawn again
 * @type {import('@codemirror/state').StateEffectType<undefined>}
 */
declare const lookChanged: import('@codemirror/state').StateEffectType<undefined>;
/**
 * The decorations that can't change the layout, over some ranges of the text
 * @param {EditorState} state - The state
 * @param {readonly Readonly<{ from: number, to: number }>[]} ranges - The ranges
 * @param {Look} look - The look
 * @returns {Readonly<{ decorations: DecorationSet, atomic: DecorationSet }>} The decorations, and those Backspace deletes
 *   whole
 */
declare function inlineDecorations(state: EditorState, ranges: readonly Readonly<{
    from: number;
    to: number;
}>[], look: Look): Readonly<{
    decorations: DecorationSet;
    atomic: DecorationSet;
}>;
export type Top = Readonly<{
    name: string;
    from: number;
    to: number;
}>;
export type Layout = Readonly<{
    tree: import('@lezer/common').Tree;
    tops: readonly Top[];
    wrappers: import('@codemirror/state').RangeSet<BlockWrapper>;
    replaced: DecorationSet;
}>;
/**
 * Everything the editor draws for a look
 * @param {Look} look - The look
 * @returns {Extension} The extensions
 */
declare function lookDecorations(look: Look): Extension;
export { inlineDecorations, lookChanged, lookDecorations };
