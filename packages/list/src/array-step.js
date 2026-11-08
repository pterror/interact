/**
 * Stepping through keys held in an array: the key `n` on from another, stopping at the ends.
 */

/** @type {WeakMap<readonly unknown[], ReadonlyMap<unknown, number>>} */
const POSITIONS = new WeakMap()

/**
 * Where each key is in an array, worked out once per array
 * @template K
 * @param {readonly K[]} keys - The array
 * @returns {ReadonlyMap<K, number>} Each key's index
 */
function positions(keys) {
  /** @type {Map<K, number>} */
  const made = new Map()
  for (const [index, key] of keys.entries()) {
    made.set(key, index)
  }
  return made
}

/**
 * A key's index in an array
 * @template K
 * @param {readonly K[]} keys - The array
 * @param {K} key - The key
 * @returns {number | undefined} Its index, if it is there
 */
function indexOf(keys, key) {
  const known = POSITIONS.get(keys)
  if (known !== undefined) {
    const index = known.get(key)
    return typeof index === 'number' ? index : undefined
  }
  const made = positions(keys)
  POSITIONS.set(keys, made)
  return made.get(key)
}

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
    const index = from === undefined ? undefined : indexOf(all, from)
    const start = index ?? (by < 0 ? all.length : -1)
    return Promise.resolve(all[Math.min(Math.max(start + by, 0), last)])
  }
}

export { arrayStep }
