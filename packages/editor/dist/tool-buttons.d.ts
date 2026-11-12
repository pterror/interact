/**
 * The buttons for a list of tools, kept in step with the editor's state: `aria-pressed` while a tool's `on` holds,
 * `aria-disabled` while its `applies` doesn't. A press keeps the editor's selection and focus, and runs the tool's
 * command on the editor.
 */
export type EditorView = import('@codemirror/view').EditorView;
export type EditorState = import('@codemirror/state').EditorState;
export type Tool = Readonly<{
    id: string;
    label: string;
    icon?: () => Element;
    run: (view: EditorView) => boolean;
    on?: (state: EditorState) => boolean;
    applies?: (state: EditorState) => boolean;
}>;
/**
 * Sets a button's state from the editor's
 * @param {HTMLElement} button - The button
 * @param {Tool} tool - Its tool
 * @param {EditorState} state - The editor's state
 * @returns {void}
 */
declare function showState(button: HTMLElement, tool: Tool, state: EditorState): void;
export type Drawn = Readonly<{
    button: HTMLElement;
    tool: Tool;
}>;
/**
 * A tool and the button drawn for it
 * @typedef {Readonly<{ button: HTMLElement, tool: Tool }>} Drawn
 */
/**
 * Draws the buttons for tools into an element, replacing what it held
 * @param {Element} into - The element
 * @param {EditorView} view - The editor
 * @param {readonly Tool[]} tools - The tools
 * @returns {readonly Drawn[]} The buttons
 */
declare function drawButtons(into: Element, view: EditorView, tools: readonly Tool[]): readonly Drawn[];
export { drawButtons, showState };
