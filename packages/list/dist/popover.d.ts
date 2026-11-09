/**
 * An element shown as a popover, placed against another, while a Watched boolean is true. It is a `manual` popover:
 * what closes it is the app's (dismiss, a key), never the browser's light dismiss. While shown it is placed again
 * when the page scrolls or resizes.
 */
export type Open = Readonly<{
    get: () => boolean;
    watch: (listener: () => void) => () => void;
}>;
export type Side = 'below' | 'right';
export type PopoverOptions = Readonly<{
    element: HTMLElement;
    anchor: Element;
    open: Open;
    side?: Side;
}>;
/**
 * Whether it is shown, and hearing that change
 * @typedef {Readonly<{ get: () => boolean, watch: (listener: () => void) => () => void }>} Open
 */
/**
 * Where it goes against its anchor: under it, starting at its left edge, or beside it, starting at its top
 * @typedef {'below' | 'right'} Side
 */
/**
 * @typedef {Readonly<{ element: HTMLElement, anchor: Element, open: Open, side?: Side }>} PopoverOptions
 */
/**
 * Shows an element as a popover while `open` is true
 * @param {PopoverOptions} options - The element, what it is placed against, whether it is shown, and on which side
 *   (default below)
 * @returns {() => void} Stops, hiding it
 */
declare function popover({ anchor, element, open, side }: PopoverOptions): () => void;
export { popover };
