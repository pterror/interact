/**
 * An element shown as a popover, placed against an anchor, while a Watched boolean is true. It is a `manual` popover:
 * what closes it is the app's (dismiss, a key), never the browser's light dismiss. The anchor is anything with a box:
 * an element, or a point (`{ getBoundingClientRect: () => new DOMRect(x, y, 0, 0) }`). While shown it is placed again
 * when the page scrolls or resizes.
 */
export type Open = Readonly<{
    get: () => boolean;
    watch: (listener: () => void) => () => void;
}>;
export type Anchor = Readonly<{
    getBoundingClientRect: () => Readonly<{
        left: number;
        top: number;
        right: number;
        bottom: number;
    }>;
}>;
export type Side = 'below' | 'right' | 'center';
export type PopoverOptions = Readonly<{
    element: HTMLElement;
    anchor: Anchor;
    open: Open;
    side?: Side;
}>;
/**
 * Shows an element as a popover while `open` is true
 * @param {PopoverOptions} options - The element, what it is placed against, whether it is shown, and on which side
 *   (default below)
 * @returns {() => void} Stops, hiding it
 */
declare function popover({ anchor, element, open, side }: PopoverOptions): () => void;
export { popover };
