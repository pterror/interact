/**
 * A layout of rows, each the same height, as wide as their container.
 */

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
function rows(height) {
  return {
    extent: (count) => ({ height: count * height }),
    place: (rank) => ({ height, x: 0, y: rank * height }),
    ranksIn: (start, end, count) => ({
      from: Math.min(Math.max(Math.floor(start / height), 0), count),
      to: Math.min(Math.max(Math.ceil(end / height), 0), count),
    }),
    watch: () => () => undefined,
  }
}

export { rows }
