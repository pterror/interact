/**
 * A key's rank, from a list in memory.
 */

import { indexIn } from './positions.js'

/**
 * @template K
 * @param {() => readonly K[]} keys - The keys now
 * @returns {(key: K) => Promise<number | undefined>} A key's rank, if the list has it
 */
function arrayLocate(keys) {
  return (key) => Promise.resolve(indexIn(keys(), key))
}

export { arrayLocate }
