/**
 * Measures each drawn element's height and hands it on with its rank, as it changes.
 */

/**
 * @template K
 * @typedef {Readonly<{
 *   rank: Readonly<{ rank: (key: K) => number | undefined }>,
 *   measure: (rank: number, height: number) => void,
 * }>} MeasureOptions
 */

/**
 * Measures elements that have a rank
 * @template K
 * @param {MeasureOptions<K>} options - Each drawn key's rank, and where heights go
 * @returns {Readonly<{ apply: (key: K, element: Element) => void, drop: (key: K, element: Element) => void,
 *   watch: () => () => void }>} The facet
 */
function measure({ measure: measured, rank }) {
  /** @type {Map<Element, K>} */
  const watched = new Map()
  /** @type {number | undefined} */
  let frame = undefined
  const report = () => {
    frame = undefined
    for (const [element, key] of watched) {
      const at = rank.rank(key)
      if (at !== undefined && element instanceof HTMLElement && element.isConnected) {
        measured(at, element.offsetHeight)
      }
    }
  }
  // Heights are handed on in the next frame: changing the layout inside the observer's callback would make it observe
  // again in the same frame, which browsers report as an error
  const observer =
    typeof ResizeObserver === 'undefined'
      ? undefined
      : new ResizeObserver(() => {
          frame ??= requestAnimationFrame(report)
        })
  return {
    apply(key, element) {
      if (rank.rank(key) !== undefined && !watched.has(element)) {
        watched.set(element, key)
        observer?.observe(element)
      }
    },
    drop(_key, element) {
      watched.delete(element)
      observer?.unobserve(element)
    },
    watch: () => () => undefined,
  }
}

export { measure }
