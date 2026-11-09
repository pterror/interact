/**
 * A scroll container: the range of its content in view, in pixels from its top, and scrolling it.
 */
export type Visible = Readonly<{
    start: number;
    end: number;
}>;
export type Viewport = Readonly<{
    get: () => Visible;
    watch: (listener: () => void) => () => void;
    scrollBy: (pixels: number) => void;
    stop: () => void;
}>;
/**
 * The content in view, from `start` to `end` pixels
 * @typedef {Readonly<{ start: number, end: number }>} Visible
 */
/**
 * @typedef {Readonly<{
 *   get: () => Visible,
 *   watch: (listener: () => void) => () => void,
 *   scrollBy: (pixels: number) => void,
 *   stop: () => void,
 * }>} Viewport
 */
/**
 * Follows what a scroll container shows
 * @param {Element} element - The scroll container
 * @returns {Viewport} What is in view, scrolling it, and stopping
 */
declare function viewport(element: Element): Viewport;
export { viewport };
