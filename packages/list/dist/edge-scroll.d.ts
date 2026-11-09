/**
 * Scrolls while the pointer is near the top or bottom edge of a scroll container during a drag, faster the nearer.
 */
export type EdgeScrollOptions = Readonly<{
    element: Element;
    scrollBy: (pixels: number) => void;
    active: Readonly<{
        get: () => boolean;
        watch: (listener: () => void) => () => void;
    }>;
}>;
/**
 * @typedef {Readonly<{
 *   element: Element,
 *   scrollBy: (pixels: number) => void,
 *   active: Readonly<{ get: () => boolean, watch: (listener: () => void) => () => void }>,
 * }>} EdgeScrollOptions
 */
/**
 * Scrolls near the edges while active
 * @param {EdgeScrollOptions} options - The scroll container, scrolling it, and whether a drag is under way
 * @returns {() => void} Stops
 */
declare function edgeScroll({ active, element, scrollBy }: EdgeScrollOptions): () => void;
export { edgeScroll };
