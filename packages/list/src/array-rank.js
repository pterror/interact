/**
 * Each key's rank, at once, from a list in memory.
 */

import { indexIn } from './positions.js'

/**
 * @template K
 * @param {Readonly<{ keys: () => readonly K[], watch: (listener: () => void) => () => void }>} list - The list
 * @returns {Readonly<{ rank: (key: K) => number | undefined, watchRanks: (listener: () => void) => () => void }>} A
 *   key's rank, and hearing ranks change
 */
function arrayRank(list) {
  return { rank: (key) => indexIn(list.keys(), key), watchRanks: (listener) => list.watch(listener) }
}

export { arrayRank }
