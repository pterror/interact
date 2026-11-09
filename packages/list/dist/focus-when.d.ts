/**
 * Focuses an element when a Watched boolean becomes true. It focuses once everything else that heard the change has
 * (in a microtask), so an element shown by the same change is shown by then, and only if the boolean is still true.
 */
export type When = Readonly<{
    get: () => boolean;
    watch: (listener: () => void) => () => void;
}>;
export type FocusWhenOptions = Readonly<{
    element: HTMLElement;
    when: When;
}>;
/**
 * Whether to have focus, and hearing that change
 * @typedef {Readonly<{ get: () => boolean, watch: (listener: () => void) => () => void }>} When
 */
/**
 * @typedef {Readonly<{ element: HTMLElement, when: When }>} FocusWhenOptions
 */
/**
 * Focuses an element each time `when` becomes true
 * @param {FocusWhenOptions} options - The element, and when it takes focus
 * @returns {() => void} Stops
 */
declare function focusWhen({ element, when }: FocusWhenOptions): () => void;
export { focusWhen };
