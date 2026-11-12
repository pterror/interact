/**
 * The tools beside the selection: a button for each, in list's `popover`, shown below the selection while text is
 * selected and the editor has focus. Unstyled. Its element goes inside the editor's own, and the popover puts it in
 * the top layer.
 */
export type Tool = import('./tool-buttons.js').Tool;
export type EditorView = import('@codemirror/view').EditorView;
/**
 * The tools beside the selection
 * @param {Readonly<{ view: EditorView, tools: readonly Tool[] }>} options - The editor and the tools
 * @returns {Readonly<{
 *   element: HTMLElement,
 *   open: Readonly<{ get: () => boolean, watch: (listener: () => void) => () => void }>,
 *   stop: () => void,
 * }>} Its element (`role=toolbar`), whether it is shown, and stopping
 */
declare function selectionBar({ tools, view }: Readonly<{
    view: EditorView;
    tools: readonly Tool[];
}>): Readonly<{
    element: HTMLElement;
    open: Readonly<{
        get: () => boolean;
        watch: (listener: () => void) => () => void;
    }>;
    stop: () => void;
}>;
export { selectionBar };
