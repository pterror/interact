/**
 * Keys held in memory in groups, each group in order and the groups in order, and the keys held from them. Its keys
 * are seen two ways: the rows (each group's header key, then its keys) and the options (the keys alone).
 */

import { arrayList } from './array-list.js'

/**
 * A group and its keys, in order
 * @template G, K
 * @typedef {readonly [G, readonly K[]]} Group
 */

/**
 * Keys in order, and hearing them change
 * @template K
 * @typedef {Readonly<{ keys: () => readonly K[], watch: (listener: () => void) => () => void }>} Keys
 */

/**
 * @template G, K
 * @typedef {Readonly<{
 *   groups: () => readonly Group<G, K>[],
 *   set: (groups: readonly Group<G, K>[]) => void,
 *   watch: (listener: () => void) => () => void,
 *   rows: Keys<K>,
 *   options: Keys<K>,
 *   sizes: Readonly<{ get: () => readonly number[], watch: (listener: () => void) => () => void }>,
 *   groupOf: (key: K) => G | undefined,
 *   headerOf: (group: G) => K,
 *   hold: ReturnType<typeof arrayList<K>>['hold'],
 * }>} ArrayGroups
 */

/**
 * @template G, K
 * @typedef {Readonly<{ rows: readonly K[], options: readonly K[], sizes: readonly number[],
 *   groupOf: ReadonlyMap<K, G> }>} Views
 */

/**
 * The rows, options, sizes and each key's group
 * @template G, K
 * @param {readonly Group<G, K>[]} groups - The groups
 * @param {(group: G) => K} headerOf - A group's header key
 * @returns {Views<G, K>} The views
 */
function views(groups, headerOf) {
  /** @type {K[]} */
  const rows = []
  /** @type {K[]} */
  const options = []
  /** @type {Map<K, G>} */
  const groupOf = new Map()
  for (const [group, keys] of groups) {
    const header = headerOf(group)
    rows.push(header)
    groupOf.set(header, group)
    for (const key of keys) {
      rows.push(key)
      options.push(key)
      groupOf.set(key, group)
    }
  }
  return { groupOf, options, rows, sizes: groups.map(([, keys]) => keys.length) }
}

/**
 * Keys in groups, in memory. Header keys are never among the keys
 * @template G, K
 * @param {Readonly<{ initial: readonly Group<G, K>[], headerOf: (group: G) => K }>} options - The groups, and each
 *   group's header key
 * @returns {ArrayGroups<G, K>} The groups
 */
function arrayGroups({ headerOf, initial }) {
  let groups = initial
  let seen = views(groups, headerOf)
  const list = arrayList(seen.options)
  return {
    groupOf: (key) => seen.groupOf.get(key),
    groups: () => groups,
    headerOf,
    hold: list.hold,
    options: { keys: () => seen.options, watch: list.watch },
    rows: { keys: () => seen.rows, watch: list.watch },
    set(next) {
      groups = next
      seen = views(groups, headerOf)
      list.set(seen.options)
    },
    sizes: { get: () => seen.sizes, watch: list.watch },
    watch: list.watch,
  }
}

export { arrayGroups }
