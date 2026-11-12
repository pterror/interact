/**
 * Key hints on tool buttons: each button's tooltip names its tool's key, and while `held` holds (a modifier held,
 * keybinds' `modifierHeld`) each button with a key shows it in `data-keys`. A piece composed onto any buttons drawn
 * for tools (`toolbar`'s, `selectionBar`'s).
 */
export type Drawn = import('./tool-buttons.js').Drawn;
export type Watched<T> = Readonly<{
    get: () => T;
    watch: (listener: () => void) => () => void;
}>;
export type KeyHintsOptions = Readonly<{
    buttons: Watched<readonly Drawn[]>;
    keyOf: (id: string) => readonly string[] | undefined;
    held?: Watched<boolean>;
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
 *   buttons: Watched<readonly Drawn[]>,
 *   keyOf: (id: string) => readonly string[] | undefined,
 *   held?: Watched<boolean>,
 * }>} KeyHintsOptions
 */
/**
 * Shows each tool's key on its button
 * @param {KeyHintsOptions} options - The buttons, how each tool's key is shown (keybinds' `formatSteps` of its
 *   binding), and whether every key is shown now
 * @returns {() => void} Stops, leaving the buttons as they are
 */
declare function keyHints({ buttons, held, keyOf }: KeyHintsOptions): () => void;
export { keyHints };
