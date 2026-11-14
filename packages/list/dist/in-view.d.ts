/**
 * Keeps an element inside its window while a Watched boolean is true: whatever placed it (a popover against its anchor,
 * anything else), it is moved by the least that keeps its box a margin inside the window, on each edge it overflows.
 * A box larger than the window keeps its top and left edges in. The box is the element's layout box, without transforms. The move is the element's own `margin-left` and
 * `margin-top`, the only inline style it writes, so it composes with whatever writes the element's place.
 *
 * It looks once everything else that heard the boolean become true has (in a microtask, as `focusWhen` does), so the
 * element is shown and placed by then; and again before the next frame is drawn after the window scrolls or resizes
 * or the element changes size, so whatever placed it again has done so first.
 */
export type Open = Readonly<{
    get: () => boolean;
    watch: (listener: () => void) => () => void;
}>;
export type InViewOptions = Readonly<{
    element: HTMLElement;
    open: Open;
    margin?: number;
}>;
/**
 * Keeps `element` inside its window while `open` is true
 * @param {InViewOptions} options - The element, when it is kept in view, and the margin (px, default 8)
 * @returns {() => void} Stops, taking its move off
 */
declare function inView({ element, margin, open }: InViewOptions): () => void;
export { inView };
