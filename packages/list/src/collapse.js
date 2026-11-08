/**
 * Opening and closing regions. Closing one that holds the active item first moves the active item to the region's
 * head, so the active item is never one that is no longer drawn.
 */

/**
 * @template K
 * @typedef {Readonly<{
 *   closed: Readonly<{ add: (key: K) => void, delete: (key: K) => void }>,
 *   active: Readonly<{ get: () => K | undefined, set: (key: K) => void }>,
 *   inside: (key: K, region: K) => Promise<boolean>,
 * }>} CollapseOptions
 */

/**
 * @template K
 * @param {CollapseOptions<K>} options - Where the closed regions are kept (the app's; `keySet` in memory), the active
 *   key, and whether a key is inside a region (the source answers, now or later)
 * @returns {Readonly<{ open: (region: K) => void, close: (region: K) => Promise<void> }>} Opening and closing
 */
function collapse({ active, closed, inside }) {
  return {
    async close(region) {
      const key = active.get()
      if (key !== undefined && key !== region && (await inside(key, region)) && active.get() === key) {
        active.set(region)
      }
      closed.add(region)
    },
    open(region) {
      closed.delete(region)
    },
  }
}

export { collapse }
