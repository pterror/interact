/**
 * A view counted up from a list's bottom: the part of a scroll container's view that falls on a list drawn from its
 * bottom, in pixels from the list's bottom, for `visibleRanks`, `windowing` and `keepInPlace` to take as they take
 * `viewport`.
 */
export type Watched<T> = Readonly<{
    get: () => T;
    watch: (listener: () => void) => () => void;
}>;
export type Visible = Readonly<{
    start: number;
    end: number;
}>;
/**
 * @template T
 * @typedef {Readonly<{ get: () => T, watch: (listener: () => void) => () => void }>} Watched
 */
/**
 * @typedef {Readonly<{ start: number, end: number }>} Visible
 */
/**
 * @param {Readonly<{
 *   visible: Watched<Visible> & Readonly<{ scrollBy: (pixels: number) => void }>,
 *   bottom: Watched<number>,
 * }>} options - The container's view, in pixels from its content's top, and the list's bottom in its content
 * @returns {Watched<Visible> & Readonly<{ scrollBy: (pixels: number) => void }>} The view from the list's bottom,
 *   heard when either moves, and scrolling the container, a positive amount upwards
 */
declare function viewFromBottom({ bottom, visible }: Readonly<{
    visible: Watched<Visible> & Readonly<{
        scrollBy: (pixels: number) => void;
    }>;
    bottom: Watched<number>;
}>): Watched<Visible> & Readonly<{
    scrollBy: (pixels: number) => void;
}>;
export { viewFromBottom };
