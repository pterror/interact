/**
 * An element shown as a popover, placed against an anchor, while a Watched boolean is true. It is a `manual` popover:
 * what closes it is the app's (dismiss, a key), never the browser's light dismiss. The anchor is anything with a box:
 * an element, or a point (`{ getBoundingClientRect: () => new DOMRect(x, y, 0, 0) }`).
 *
 * Placed below or beside its anchor, it is kept inside the window: if it would come closer than a margin to the
 * window's edge on a side it grows towards, it is flipped to the anchor's other side across, then along, then both,
 * taking the first that fits (none fitting, it stays as first placed). Against an HTML element, in a browser with CSS
 * Anchor Positioning, it is shown with the element as its `source`, its implicit anchor, and the browser places it,
 * follows the anchor and flips it (`position-try-fallbacks`); otherwise it is placed and flipped the same way here,
 * again when the page scrolls or resizes or the element changes size. A centred popover is centred on its anchor, and
 * not kept inside the window.
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
export type Side = 'below' | 'right' | 'left' | 'center';
export type PopoverOptions = Readonly<{
    element: HTMLElement;
    anchor: Anchor;
    open: Open;
    side?: Side;
}>;
export type Box = ReturnType<Anchor['getBoundingClientRect']>;
export type Edge = 'left' | 'right' | 'top' | 'bottom';
export type Placing = Readonly<{
    x: readonly [Edge, Edge];
    y: readonly [Edge, Edge];
}>;
/**
 * Shows an element as a popover while `open` is true
 * @param {PopoverOptions} options - The element, what it is placed against, whether it is shown, and on which side
 *   (default below)
 * @returns {() => void} Stops, hiding it
 */
declare function popover({ anchor, element, open, side }: PopoverOptions): () => void;
export { popover };
