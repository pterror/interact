/**
 * Moving a key next to another in groups held in memory, into the other key's group; a group's header as the target
 * puts the key first in that group.
 */

/**
 * @template G, K
 * @typedef {readonly [G, readonly K[]]} Group
 */

/**
 * @template G, K
 * @typedef {Readonly<{
 *   groups: () => readonly Group<G, K>[],
 *   set: (groups: readonly Group<G, K>[]) => void,
 *   groupOf: (key: K) => G | undefined,
 *   headerOf: (group: G) => K,
 * }>} Groups
 */

/**
 * @template G, K
 * @param {Groups<G, K>} groups - The groups
 * @returns {(key: K, target: K, after: boolean) => boolean} Moves `key` just after or before `target`, or first in
 *   the group whose header `target` is, answering once the groups' listeners have heard; `false`, moving nothing, if
 *   either isn't there or `key` is a header
 */
function groupReorder(groups) {
  return (key, target, after) => {
    const into = groups.groupOf(target)
    const from = groups.groupOf(key)
    if (into === undefined || from === undefined || groups.headerOf(from) === key) {
      return false
    }
    if (key === target) {
      return true
    }
    const header = groups.headerOf(into) === target
    groups.set(
      groups.groups().map(([group, keys]) => {
        const rest = keys.filter((each) => each !== key)
        if (group !== into) {
          return [group, rest]
        }
        const at = header ? 0 : rest.indexOf(target) + (after ? 1 : 0)
        return [group, [...rest.slice(0, at), key, ...rest.slice(at)]]
      }),
    )
    return true
  }
}

export { groupReorder }
