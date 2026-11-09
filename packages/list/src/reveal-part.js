/**
 * Scrolls the part of a key's element that stands for the item into view when the key changes; the element itself when
 * the app names no part.
 */

/**
 * A key, and hearing it change
 * @template K
 * @typedef {Readonly<{ get: () => K | undefined, watch: (listener: () => void) => () => void }>} Target
 */

/**
 * @template K
 * @typedef {Readonly<{ target: Target<K>, part: (key: K, element: Element) => Element | undefined }>}
 *   RevealPartOptions
 */

/**
 * Reveals the part of a key's element that stands for it, each time the key changes
 * @template K
 * @param {RevealPartOptions<K>} options - The key to reveal, and the part of its element to scroll into view
 * @returns {Readonly<{ apply: (key: K, element: Element) => void,
 *   watch: (listener: (keys?: readonly K[]) => void) => () => void }>} The facet
 */
function revealPart({ part, target }) {
  /** @type {K | undefined} */
  let pending = undefined
  return {
    apply(key, element) {
      if (key !== pending) {
        return
      }
      pending = undefined
      queueMicrotask(() => {
        if (element.isConnected) {
          ;(part(key, element) ?? element).scrollIntoView({ block: 'nearest', inline: 'nearest' })
        }
      })
    },
    watch(listener) {
      return target.watch(() => {
        pending = target.get()
        if (pending !== undefined) {
          listener([pending])
        }
      })
    },
  }
}

export { revealPart }
