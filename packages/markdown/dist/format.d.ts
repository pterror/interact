/**
 * Formatting markdown text, read from the syntax tree, so italics aren't mistaken for half of bold and the marks are
 * found wherever the cursor is inside them (from cyoa's `format.ts`). Each is a CodeMirror command, with a test of
 * the state where it has one, for a tool's `on`.
 *
 * With nothing selected, a style applies to the word at the cursor; between words it writes an empty pair to type
 * into, and pressing it again with nothing typed takes the pair out. At the end of words in a style, pressing it steps
 * past the closing mark, so typing goes on in plain text. That is the switch for what is typed next, and `hasStyle` is
 * its pressed state.
 */
export type EditorState = import('@codemirror/state').EditorState;
export type EditorView = import('@codemirror/view').EditorView;
export type SyntaxNode = import('@lezer/common').SyntaxNode;
export type Style = 'bold' | 'italic' | 'strike' | 'code' | 'underline';
export type Span = Readonly<{
    from: number;
    to: number;
}>;
/**
 * Whether the selection is in a style: what toggling it would turn off
 * @param {EditorState} state - The state
 * @param {Style} style - The style
 * @returns {boolean} Whether it is
 */
declare function hasStyle(state: EditorState, style: Style): boolean;
/**
 * Toggles a style on the selection
 * @param {Style} style - The style
 * @returns {(view: EditorView) => boolean} The command
 */
declare function toggleStyle(style: Style): (view: EditorView) => boolean;
/**
 * Makes the lines the selection touches headings, one level smaller each time to the third, then plain text again
 * @param {EditorView} view - The editor
 * @returns {boolean} That it ran
 */
declare function heading(view: EditorView): boolean;
/**
 * Whether the lines the selection touches are headings
 * @param {EditorState} state - The state
 * @returns {boolean} Whether they all are
 */
declare const inHeading: (state: EditorState) => boolean;
declare const quote: (view: EditorView) => boolean;
/**
 * Whether the lines the selection touches are quoted
 * @param {EditorState} state - The state
 * @returns {boolean} Whether they all are
 */
declare const inQuote: (state: EditorState) => boolean;
declare const list: (view: EditorView) => boolean;
/**
 * Whether the lines the selection touches are list items
 * @param {EditorState} state - The state
 * @returns {boolean} Whether they all are
 */
declare const inList: (state: EditorState) => boolean;
/**
 * Whether the selection is in a fenced code block
 * @param {EditorState} state - The state
 * @returns {boolean} Whether it is
 */
declare const inCodeBlock: (state: EditorState) => boolean;
/**
 * Puts the lines the selection touches in a fenced code block, or takes the fences of the block it is in away
 * @param {EditorView} view - The editor
 * @returns {boolean} That it ran
 */
declare function codeBlock(view: EditorView): boolean;
/**
 * Whether the selection is in a link
 * @param {EditorState} state - The state
 * @returns {boolean} Whether it is
 */
declare const inLink: (state: EditorState) => boolean;
/**
 * Makes the selection (or the word at the cursor) a link with the cursor where its address goes, or takes the link it
 * is in away, leaving its text
 * @param {EditorView} view - The editor
 * @returns {boolean} That it ran
 */
declare function link(view: EditorView): boolean;
export { codeBlock, hasStyle, heading, inCodeBlock, inHeading, inLink, inList, inQuote, link, list, quote, toggleStyle };
