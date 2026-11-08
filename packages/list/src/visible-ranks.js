/**
 * The ranks in view: from the pixels in view, a layout and how many items there are.
 */

/**
 * @template T
 * @typedef {Readonly<{ get: () => T, watch: (listener: () => void) => () => void }>} Watched
 */

/**
 * @typedef {Readonly<{ from: number, to: number }>} Ranks
 */

/**
 * @typedef {Readonly<{
 *   visible: Watched<Readonly<{ start: number, end: number }>>,
 *   layout: Readonly<{ ranksIn: (start: number, end: number, count: number) => Ranks,
 *     watch: (listener: () => void) => () => void }>,
 *   count: Watched<number>,
 * }>} VisibleRanksOptions
 */

/**
 * Follows the ranks in view
 * @param {VisibleRanksOptions} options - What is in view, the layout, and the count
 * @returns {Watched<Ranks>} The ranks from `from` up to `to`
 */
function visibleRanks({ count, layout, visible }) {
  return {
    get() {
      const { end, start } = visible.get()
      return layout.ranksIn(start, end, count.get())
    },
    watch(listener) {
      const stops = [visible.watch(listener), layout.watch(listener), count.watch(listener)]
      return () => {
        for (const stop of stops) {
          stop()
        }
      }
    },
  }
}

export { visibleRanks }
