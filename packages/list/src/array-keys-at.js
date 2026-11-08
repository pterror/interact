/**
 * The keys at ranks, from a list in memory.
 */

/**
 * @template K
 * @param {Readonly<{ keys: () => readonly K[], watch: (listener: () => void) => () => void }>} list - The list
 * @returns {Readonly<{ keysAt: (from: number, to: number) => Promise<readonly K[]>,
 *   watch: (listener: () => void) => () => void }>} The keys from rank `from` up to `to`, and hearing them change
 */
function arrayKeysAt(list) {
  return {
    keysAt: (from, to) => Promise.resolve(list.keys().slice(from, to)),
    watch: (listener) => list.watch(listener),
  }
}

export { arrayKeysAt }
