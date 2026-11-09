/**
 * A layout of rows, each the same height, as wide as their container.
 */
export type Rect = Readonly<{
    x: number;
    y: number;
    width?: number;
    height: number;
}>;
export type Layout = Readonly<{
    ranksIn: (start: number, end: number, count: number) => Readonly<{
        from: number;
        to: number;
    }>;
    place: (rank: number) => Rect;
    extent: (count: number) => Readonly<{
        height: number;
    }>;
    watch: (listener: () => void) => () => void;
}>;
/**
 * Where an item goes, in pixels; no width means as wide as the container
 * @typedef {Readonly<{ x: number, y: number, width?: number, height: number }>} Rect
 */
/**
 * @typedef {Readonly<{
 *   ranksIn: (start: number, end: number, count: number) => Readonly<{ from: number, to: number }>,
 *   place: (rank: number) => Rect,
 *   extent: (count: number) => Readonly<{ height: number }>,
 *   watch: (listener: () => void) => () => void,
 * }>} Layout
 */
/**
 * Rows of one height
 * @param {number} height - Each row's height in pixels
 * @returns {Layout} The layout; it never changes
 */
declare function rows(height: number): Layout;
export { rows };
