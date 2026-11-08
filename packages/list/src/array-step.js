/**
 * Stepping through keys held in an array: the key `n` on from another, stopping at the ends.
 */

import { indexIn } from './positions.js'

/**
 * Steps through the array a function gives: `step(none, 1)` is the first key, `step(none, -1)` the last, `step(k, n)`
 * the key `n` on from `k`, stopping at the ends. A key not in the array steps as none. Answers later, as any Step may
 * @template K
 * @param {() => readonly K[]} keys - The keys now
 * @returns {(from: K | undefined, by: number) => Promise<K | undefined>} The Step
 */
function arrayStep(keys) {
  return (from, by) => {
    const all = keys()
    const last = all.length - 1
    const index = from === undefined ? undefined : indexIn(all, from)
    const start = index ?? (by < 0 ? all.length : -1)
    return Promise.resolve(all[Math.min(Math.max(start + by, 0), last)])
  }
}

export { arrayStep }
