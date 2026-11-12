/**
 * A toolbar for an editor: a button for each of a Watched list of tools, in an element the app places in space the
 * field always reserves, so it never moves the field. Unstyled. Its buttons are a Watched, for what the app composes
 * onto them (`keyHints`). Which tools a person has is the app's: the list it passes and keeps.
 */
export type Tool = import('./tool-buttons.js').Tool;
export type Drawn = import('./tool-buttons.js').Drawn;
export type Watched<T> = Readonly<{
    get: () => T;
    watch: (listener: () => void) => () => void;
}>;
/**
 * @typedef {import('./tool-buttons.js').Tool} Tool
 * @typedef {import('./tool-buttons.js').Drawn} Drawn
 */
/**
 * A value, and hearing it change
 * @template T
 * @typedef {Readonly<{ get: () => T, watch: (listener: () => void) => () => void }>} Watched
 */
/**
 * A toolbar
 * @param {Readonly<{ view: import('@codemirror/view').EditorView, tools: Watched<readonly Tool[]> }>} options - The
 *   editor and its tools
 * @returns {Readonly<{ element: HTMLElement, buttons: Watched<readonly Drawn[]>, stop: () => void }>} Its element
 *   (`role=toolbar`), the buttons it draws, and stopping
 */
declare function toolbar({ tools, view }: Readonly<{
    view: import('@codemirror/view').EditorView;
    tools: Watched<readonly Tool[]>;
}>): Readonly<{
    element: HTMLElement;
    buttons: Watched<readonly Drawn[]>;
    stop: () => void;
}>;
export { toolbar };
