/**
 * A toolbar for an editor: a button for each of a Watched list of tools, in an element the app places in space the
 * field always reserves, so it never moves the field. Unstyled. Each button's tooltip names its key; while `held`
 * holds (a modifier held, keybinds' `modifierHeld`), each button with a key shows it in `data-keys`. Which tools a
 * person has is the app's: the list it passes and keeps.
 */
export type Tool = import('./tool-buttons.js').Tool;
export type Watched<T> = Readonly<{
    get: () => T;
    watch: (listener: () => void) => () => void;
}>;
export type ToolbarOptions = Readonly<{
    view: import('@codemirror/view').EditorView;
    tools: Watched<readonly Tool[]>;
    keyOf?: (id: string) => readonly string[] | undefined;
    held?: Watched<boolean>;
}>;
/**
 * @typedef {import('./tool-buttons.js').Tool} Tool
 */
/**
 * A value, and hearing it change
 * @template T
 * @typedef {Readonly<{ get: () => T, watch: (listener: () => void) => () => void }>} Watched
 */
/**
 * @typedef {Readonly<{
 *   view: import('@codemirror/view').EditorView,
 *   tools: Watched<readonly Tool[]>,
 *   keyOf?: (id: string) => readonly string[] | undefined,
 *   held?: Watched<boolean>,
 * }>} ToolbarOptions
 */
/**
 * A toolbar
 * @param {ToolbarOptions} options - The editor, its tools, how each tool's key is shown (keybinds' `formatSteps` of
 *   its binding), and whether every key is shown now
 * @returns {Readonly<{ element: HTMLElement, stop: () => void }>} Its element (`role=toolbar`), and stopping
 */
declare function toolbar({ held, keyOf, tools, view }: ToolbarOptions): Readonly<{
    element: HTMLElement;
    stop: () => void;
}>;
export { toolbar };
