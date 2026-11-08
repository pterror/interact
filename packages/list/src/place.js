/**
 * Places each element where the layout puts its rank, so no element moves another.
 */

/**
 * Where an item goes, in pixels; no width means as wide as the container, no height as tall as its content
 * @typedef {Readonly<{ x: number, y: number, width?: number, height?: number }>} Rect
 */

/**
 * @template K
 * @typedef {Readonly<{
 *   rank: Readonly<{ rank: (key: K) => number | undefined, watchRanks: (listener: () => void) => () => void }>,
 *   layout: Readonly<{ place: (rank: number) => Rect, watch: (listener: () => void) => () => void }>,
 * }>} PlaceOptions
 */

/**
 * Places elements by rank. The container is their containing block
 * @template K
 * @param {PlaceOptions<K>} options - Each drawn key's rank, and the layout
 * @returns {Readonly<{ apply: (key: K, element: Element) => void,
 *   watch: (listener: (keys?: readonly K[]) => void) => () => void }>} The facet
 */
function place({ layout, rank }) {
  return {
    apply(key, element) {
      const at = rank.rank(key)
      if (at === undefined || !(element instanceof HTMLElement)) {
        return
      }
      const { height, width, x, y } = layout.place(at)
      const { style } = element
      style.position = 'absolute'
      style.boxSizing = 'border-box'
      style.top = `${String(y)}px`
      style.left = `${String(x)}px`
      if (height === undefined) {
        style.removeProperty('height')
      } else {
        style.height = `${String(height)}px`
      }
      if (width === undefined) {
        style.right = '0'
        style.removeProperty('width')
      } else {
        style.removeProperty('right')
        style.width = `${String(width)}px`
      }
    },
    watch(listener) {
      const stops = [
        rank.watchRanks(() => {
          listener()
        }),
        layout.watch(() => {
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

export { place }
