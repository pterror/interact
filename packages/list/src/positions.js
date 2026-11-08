/**
 * Each key's index in an array, worked out once per array.
 */

/** @type {WeakMap<readonly unknown[], ReadonlyMap<unknown, number>>} */
const POSITIONS = new WeakMap()

/**
 * A key's index in an array
 * @template K
 * @param {readonly K[]} keys - The array
 * @param {K} key - The key
 * @returns {number | undefined} Its index, if it is there
 */
function indexIn(keys, key) {
  let known = POSITIONS.get(keys)
  if (known === undefined) {
    /** @type {Map<unknown, number>} */
    const made = new Map()
    for (const [index, each] of keys.entries()) {
      made.set(each, index)
    }
    POSITIONS.set(keys, made)
    known = made
  }
  return known.get(key)
}

export { indexIn }
