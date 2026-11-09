/**
 * A view counted from a top that moves: the part of a scroll container's view that falls on a list placed somewhere in
 * its content, in pixels from the list's top, so several lists can share one scroller.
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
 *   top: Watched<number>,
 * }>} options - The container's view, and the list's top in its content
 * @returns {Watched<Visible> & Readonly<{ scrollBy: (pixels: number) => void }>} The view from the list's top,
 *   heard when either moves, and scrolling the container
 */
declare function viewFrom({ top, visible }: Readonly<{
    visible: Watched<Visible> & Readonly<{
        scrollBy: (pixels: number) => void;
    }>;
    top: Watched<number>;
}>): Watched<Visible> & Readonly<{
    scrollBy: (pixels: number) => void;
}>;
export { viewFrom };
