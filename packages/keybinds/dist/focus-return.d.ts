/**
 * Giving focus back when an element closes: what had focus as it opened gets it again, if focus is then inside the
 * element or nowhere (hiding the element took it), and not if the person has moved it elsewhere.
 */
export type FocusReturnOptions = Readonly<{
    element: Element;
    open: Readonly<{
        get: () => boolean;
        watch: (listener: () => void) => () => void;
    }>;
}>;
/**
 * @typedef {Readonly<{
 *   element: Element,
 *   open: Readonly<{ get: () => boolean, watch: (listener: () => void) => () => void }>,
 * }>} FocusReturnOptions
 */
/**
 * Gives focus back as the element closes
 * @param {FocusReturnOptions} options - The element, and whether it is open
 * @returns {() => void} Stopping
 */
declare function focusReturn({ element, open }: FocusReturnOptions): () => void;
export { focusReturn };
