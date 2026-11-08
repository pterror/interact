/**
 * A list that never changes, whose keys are worked out from their ranks rather than stored: as long as you like,
 * and nothing made for an item until it is asked for.
 */

/**
 * @template K
 * @typedef {Readonly<{ count: number, keyAt: (rank: number) => K }>} Computed
 */

/**
 * The keys at ranks
 * @template K
 * @param {Computed<K>} list - How many keys, and the key at a rank
 * @returns {Readonly<{ keysAt: (from: number, to: number) => Promise<readonly K[]>,
 *   watch: (listener: () => void) => () => void }>} The keys from rank `from` up to `to`; they never change
 */
function computedKeysAt({ count, keyAt }) {
  return {
    keysAt(from, to) {
      /** @type {K[]} */
      const keys = []
      for (let rank = Math.max(from, 0); rank < Math.min(to, count); rank += 1) {
        keys.push(keyAt(rank))
      }
      return Promise.resolve(keys)
    },
    watch: () => () => undefined,
  }
}

/**
 * Steps through the keys, stopping at the ends, as `arrayStep` does
 * @template K
 * @param {Computed<K> & Readonly<{ rankOf: (key: K) => number | undefined }>} list - How many keys, the key at a rank,
 *   and a key's rank
 * @returns {(from: K | undefined, by: number) => Promise<K | undefined>} The Step
 */
function computedStep({ count, keyAt, rankOf }) {
  return (from, by) => {
    if (count === 0) {
      return Promise.resolve(undefined)
    }
    const rank = from === undefined ? undefined : rankOf(from)
    const start = rank ?? (by < 0 ? count : -1)
    return Promise.resolve(keyAt(Math.min(Math.max(start + by, 0), count - 1)))
  }
}

/**
 * A key's rank
 * @template K
 * @param {(key: K) => number | undefined} rankOf - A key's rank, if the list has it
 * @returns {(key: K) => Promise<number | undefined>} The Locate
 */
function computedLocate(rankOf) {
  return (key) => Promise.resolve(rankOf(key))
}

export { computedKeysAt, computedLocate, computedStep }
