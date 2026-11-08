/**
 * Tells a screen reader where each option is among all of them, drawn or not.
 */

/**
 * @template T
 * @typedef {Readonly<{ get: () => T, watch: (listener: () => void) => () => void }>} Watched
 */

/**
 * @template K
 * @typedef {Readonly<{
 *   position: Readonly<{ rank: (key: K) => number | undefined, watchRanks: (listener: () => void) => () => void }>,
 *   count: Watched<number>,
 * }>} PosInSetOptions
 */

/**
 * Sets `aria-posinset` and `aria-setsize` on each option; an element with no position gets neither
 * @template K
 * @param {PosInSetOptions<K>} options - Each key's position among the options from 0, and how many there are
 * @returns {Readonly<{ apply: (key: K, element: Element) => void,
 *   watch: (listener: (keys?: readonly K[]) => void) => () => void }>} The facet
 */
function posInSet({ count, position }) {
  return {
    apply(key, element) {
      const at = position.rank(key)
      if (at === undefined) {
        element.removeAttribute('aria-posinset')
        element.removeAttribute('aria-setsize')
        return
      }
      element.setAttribute('aria-posinset', String(at + 1))
      element.setAttribute('aria-setsize', String(count.get()))
    },
    watch(listener) {
      const stops = [
        position.watchRanks(() => {
          listener()
        }),
        count.watch(() => {
          listener()
        }),
      ]
      return () => {
        for (const stop of stops) {
          stop()
        }
      }
    },
  }
}

export { posInSet }
