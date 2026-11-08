/**
 * A layout of cards of one size, in as many columns as the width holds (at least one), row after row.
 */

/**
 * @template T
 * @typedef {Readonly<{ get: () => T, watch: (listener: () => void) => () => void }>} Watched
 */

/**
 * @typedef {Readonly<{ width: Watched<number>, cardWidth: number, cardHeight: number }>} CardsOptions
 */

/**
 * @typedef {Readonly<{ x: number, y: number, width?: number, height: number }>} Rect
 */

/**
 * @typedef {Readonly<{
 *   ranksIn: (start: number, end: number, count: number) => Readonly<{ from: number, to: number }>,
 *   place: (rank: number) => Rect,
 *   extent: (count: number) => Readonly<{ height: number }>,
 *   watch: (listener: () => void) => () => void,
 *   columns: Watched<number>,
 * }>} Cards
 */

/**
 * Cards in columns
 * @param {CardsOptions} options - The width they fill, and each card's size in pixels
 * @returns {Cards} The layout, and its column count
 */
function cards({ cardHeight, cardWidth, width }) {
  const columns = () => Math.max(Math.floor(width.get() / cardWidth), 1)
  return {
    columns: { get: columns, watch: (listener) => width.watch(listener) },
    extent: (count) => ({ height: Math.ceil(count / columns()) * cardHeight }),
    place(rank) {
      const across = columns()
      return {
        height: cardHeight,
        width: cardWidth,
        x: (rank % across) * cardWidth,
        y: Math.floor(rank / across) * cardHeight,
      }
    },
    ranksIn(start, end, count) {
      const across = columns()
      const clamp = (/** @type {number} */ rank) => Math.min(Math.max(rank, 0), count)
      return {
        from: clamp(Math.floor(start / cardHeight) * across),
        to: clamp(Math.ceil(end / cardHeight) * across),
      }
    },
    watch: (listener) => width.watch(listener),
  }
}

export { cards }
