/**
 * Closing something by the usual gestures: a press outside every element it is made of, or an Escape nothing else
 * took (one whose default nothing prevented, as keybinds prevents a key a command takes). An inner level that binds
 * Escape itself closes alone, and the press of a control among the elements (the button that toggles it) is left to
 * that control.
 */
export type SetOpen = (open: boolean) => void;
export type DismissOptions = Readonly<{
    elements: readonly Element[];
    to: SetOpen;
}>;
/**
 * Setting whether it is open
 * @typedef {(open: boolean) => void} SetOpen
 */
/**
 * @typedef {Readonly<{ elements: readonly Element[], to: SetOpen }>} DismissOptions
 */
/**
 * Sets `false` on a press outside the elements, or an Escape left untaken
 * @param {DismissOptions} options - What it is made of, and setting whether it is open
 * @returns {() => void} Stops
 */
declare function dismiss({ elements, to }: DismissOptions): () => void;
export { dismiss };
