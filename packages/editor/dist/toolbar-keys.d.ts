/**
 * The keys of a toolbar, as the WAI-ARIA Authoring Practices' toolbar has them: the toolbar is one stop in the Tab
 * order (a roving tabindex: 0 on one button, -1 on the rest), the arrow keys along it move between its buttons and
 * wrap, Home and End go to its ends. The button in the Tab order is the one last focused, else the first. A piece
 * composed onto any buttons drawn for tools (`toolbar`'s, `selectionBar`'s), followed as they are drawn again.
 */
export type Drawn = import('./tool-buttons.js').Drawn;
export type Watched<T> = Readonly<{
    get: () => T;
    watch: (listener: () => void) => () => void;
}>;
export type ToolbarKeysOptions = Readonly<{
    element: HTMLElement;
    buttons: Watched<readonly Drawn[]>;
    orientation?: 'horizontal' | 'vertical';
}>;
/**
 * @typedef {import('./tool-buttons.js').Drawn} Drawn
 */
/**
 * A value, and hearing it change
 * @template T
 * @typedef {Readonly<{ get: () => T, watch: (listener: () => void) => () => void }>} Watched
 */
/**
 * @typedef {Readonly<{
 *   element: HTMLElement,
 *   buttons: Watched<readonly Drawn[]>,
 *   orientation?: 'horizontal' | 'vertical',
 * }>} ToolbarKeysOptions
 */
/**
 * Moves focus among a toolbar's buttons by keys
 * @param {ToolbarKeysOptions} options - The toolbar's element (it gets `aria-orientation`), its buttons, and which way
 *   it runs (`horizontal` by default: Left and Right move)
 * @returns {() => void} Stops, leaving every button in the Tab order
 */
declare function toolbarKeys({ buttons, element, orientation }: ToolbarKeysOptions): () => void;
export { toolbarKeys };
