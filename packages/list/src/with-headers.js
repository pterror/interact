/**
 * Keys to draw with a header row before each group's first key. The keys of a group must come together.
 */

/**
 * @template K
 * @typedef {Readonly<{ keys: () => readonly K[], watch: (listener: () => void) => () => void }>} Drawn
 */

/**
 * @template K, G
 * @typedef {Readonly<{ drawn: Drawn<K>, groupOf: (key: K) => G, headerOf: (group: G) => K }>} WithHeadersOptions
 */

/**
 * Adds a header row before each group
 * @template K, G
 * @param {WithHeadersOptions<K, G>} options - The keys, each key's group, and each group's header key
 * @returns {Drawn<K>} The keys with headers
 */
function withHeaders({ drawn, groupOf, headerOf }) {
  /** @type {readonly K[] | undefined} */
  let from = undefined
  /** @type {readonly K[]} */
  let made = []
  return {
    keys() {
      const keys = drawn.keys()
      if (keys !== from) {
        from = keys
        /** @type {K[]} */
        const rows = []
        /** @type {{ group: G } | undefined} */
        let last = undefined
        for (const key of keys) {
          const group = groupOf(key)
          if (last === undefined || last.group !== group) {
            rows.push(headerOf(group))
            last = { group }
          }
          rows.push(key)
        }
        made = rows
      }
      return made
    },
    watch: (listener) => drawn.watch(listener),
  }
}

export { withHeaders }
