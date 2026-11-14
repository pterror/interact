/**
 * A view counted from an edge that moves: the part of a scroll container's view that falls on a list placed somewhere
 * in its content, in pixels from the list's top, so several lists can share one scroller; or, for a list counted from
 * its bottom (a chat), in pixels up from the list's bottom.
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
 *   edge?: 'top' | 'bottom',
 * }>} options - The container's view, in pixels from its content's top; the list's edge in its content, its top or
 *   its bottom (`topIn`); and which edge that is (`top` by default)
 * @returns {Watched<Visible> & Readonly<{ scrollBy: (pixels: number) => void }>} The view from the list's edge, heard
 *   when either moves, and scrolling the container (counted from the bottom, a positive amount scrolls up)
 */
declare function viewFrom({ edge, top, visible }: Readonly<{
    visible: Watched<Visible> & Readonly<{
        scrollBy: (pixels: number) => void;
    }>;
    top: Watched<number>;
    edge?: 'top' | 'bottom';
}>): Watched<Visible> & Readonly<{
    scrollBy: (pixels: number) => void;
}>;
export { viewFrom };
