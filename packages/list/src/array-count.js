/**
 * How many keys a list in memory has.
 */

/**
 * @template K
 * @param {Readonly<{ keys: () => readonly K[], watch: (listener: () => void) => () => void }>} list - The list
 * @returns {Readonly<{ get: () => number, watch: (listener: () => void) => () => void }>} The count
 */
function arrayCount(list) {
  return { get: () => list.keys().length, watch: (listener) => list.watch(listener) }
}

export { arrayCount }
