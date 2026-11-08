/**
 * Scrolls a key's element into view when the key changes. It is a facet: the scroll happens when the element is
 * applied, so it doesn't matter whether the element existed when the key changed; and it waits for the end of that
 * pass, so every other facet (one that places the element, say) has been applied.
 */

/**
 * A key, and hearing it change
 * @template K
 * @typedef {Readonly<{ get: () => K | undefined, watch: (listener: () => void) => () => void }>} Target
 */

/**
 * Reveals a key's element each time the key changes
 * @template K
 * @param {Target<K>} target - The key to reveal
 * @returns {Readonly<{ apply: (key: K, element: Element) => void,
 *   watch: (listener: (keys?: readonly K[]) => void) => () => void }>} The facet
 */
function reveal(target) {
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
          element.scrollIntoView({ block: 'nearest', inline: 'nearest' })
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

export { reveal }
