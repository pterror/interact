/**
 * A test over occurrences from a test over entries, for a list where one entry can appear in several places: each
 * occurrence holds if its entry does. Whether selection works by entry or by occurrence is the app's choice; this is
 * the first.
 */

/**
 * @template K, E
 * @typedef {Readonly<{
 *   test: Readonly<{ has: (entry: E) => boolean, watch: (listener: () => void) => () => void }>,
 *   entryOf: (key: K) => E | undefined,
 * }>} ByEntryOptions
 */

/**
 * @template K, E
 * @param {ByEntryOptions<K, E>} options - The test over entries, and each occurrence's entry
 * @returns {Readonly<{ has: (key: K) => boolean, watch: (listener: (keys?: readonly K[]) => void) => () => void }>}
 *   The test over occurrences; a change to any entry may change any occurrence
 */
function byEntry({ entryOf, test }) {
  return {
    has(key) {
      const entry = entryOf(key)
      return entry !== undefined && test.has(entry)
    },
    watch: (listener) =>
      test.watch(() => {
        listener()
      }),
  }
}

export { byEntry }
