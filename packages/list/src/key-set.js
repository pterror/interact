/**
 * A set of keys in memory, such as closed regions: for tests, and for an app that keeps them nowhere else. An app that
 * keeps them (on its server, with the view) gives its own implementation of the same shape instead.
 */

/**
 * @template K
 * @typedef {Readonly<{
 *   has: (key: K) => boolean,
 *   add: (key: K) => void,
 *   delete: (key: K) => void,
 *   watch: (listener: (keys?: readonly K[]) => void) => () => void,
 * }>} KeySet
 */

/**
 * Holds keys
 * @template K
 * @param {readonly K[]} [initial] - The keys it starts with (default: none)
 * @returns {KeySet<K>} The set; listeners hear each key added or deleted
 */
function keySet(initial = []) {
  const keys = new Set(initial)
  /** @type {Set<(keys?: readonly K[]) => void>} */
  const listeners = new Set()
  /**
   * @param {K} key - The key that changed
   * @returns {void}
   */
  const tell = (key) => {
    for (const listener of listeners) {
      listener([key])
    }
  }
  return {
    add(key) {
      if (!keys.has(key)) {
        keys.add(key)
        tell(key)
      }
    },
    delete(key) {
      if (keys.delete(key)) {
        tell(key)
      }
    },
    has: (key) => keys.has(key),
    watch(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

export { keySet }
