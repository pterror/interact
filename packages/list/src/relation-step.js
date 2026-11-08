/**
 * A Step from one hop the list's source answers, now or later: the parent of a key, its first child, or any such
 * relation. `step(k, n)` takes `n` hops and stops where the source has no answer, staying on the last key reached; from
 * none it stays at none.
 */

/**
 * @template K
 * @param {(key: K) => Promise<K | undefined>} relation - The key one hop on from another, if there is one
 * @returns {(from: K | undefined, by: number) => Promise<K | undefined>} The Step
 */
function relationStep(relation) {
  return async (from, by) => {
    let key = from
    for (let left = Math.abs(by); left > 0 && key !== undefined; left -= 1) {
      // oxlint-disable-next-line no-await-in-loop -- each hop starts where the last one ended
      const next = await relation(key)
      if (next === undefined) {
        break
      }
      key = next
    }
    return key
  }
}

export { relationStep }
