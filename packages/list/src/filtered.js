/**
 * The keys of a list that match a query, in the list's order, held in memory: a list (keys, watch, hold) of its own,
 * kept in step with the list and the query. Its held keys are held from the filtered keys, so a key the query leaves
 * out moves as a removed key does, inside the change, before anything hears of it.
 */

import { arrayList } from './array-list.js'

/** @typedef {import('./array-list.js').WhenRemoved} WhenRemoved */

/**
 * @template K
 * @typedef {import('./array-list.js').Held<K>} Held
 */

/**
 * The keys to filter, and hearing them change
 * @template K
 * @typedef {Readonly<{ keys: () => readonly K[], watch: (listener: () => void) => () => void }>} Keys
 */

/**
 * The query, and hearing it change
 * @template Q
 * @typedef {Readonly<{ get: () => Q, watch: (listener: () => void) => () => void }>} Query
 */

/**
 * @template K, Q
 * @typedef {Readonly<{ list: Keys<K>, query: Query<Q>, matches: (key: K, query: Q) => boolean }>} FilteredOptions
 */

/**
 * The keys that match
 * @template K, Q
 * @param {FilteredOptions<K, Q>} options - The keys; the query (textValue() of a field); and whether a key matches it
 * @returns {Readonly<{
 *   keys: () => readonly K[],
 *   watch: (listener: () => void) => () => void,
 *   hold: (initial: K | undefined, whenRemoved: WhenRemoved) => Held<K>,
 *   stop: () => void,
 * }>} The matching keys (a Drawn, and a Value for arrayStep()); holding one; and no longer following the list and the
 *   query
 */
function filtered({ list, matches, query }) {
  const matching = () => {
    const wanted = query.get()
    return list.keys().filter((key) => matches(key, wanted))
  }
  const kept = arrayList(matching())
  const update = () => {
    kept.set(matching())
  }
  const stops = [list.watch(update), query.watch(update)]
  return {
    hold: kept.hold,
    keys: kept.keys,
    stop() {
      for (const stop of stops) {
        stop()
      }
    },
    watch: kept.watch,
  }
}

export { filtered }
