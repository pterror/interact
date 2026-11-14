/**
 * Moving an item next to another, in a list in memory.
 */

/**
 * @template K
 * @param {Readonly<{ keys: () => readonly K[], set: (keys: readonly K[]) => void }>} list - The list
 * @returns {(key: K, target: K, after: boolean) => boolean} Moves `key` just after or before `target`, answering
 *   once the list's listeners have heard; `false`, moving nothing, if either isn't in the list
 */
function arrayReorder(list) {
  return (key, target, after) => {
    const all = list.keys()
    if (!all.includes(key) || !all.includes(target)) {
      return false
    }
    if (key === target) {
      return true
    }
    const rest = all.filter((each) => each !== key)
    const at = rest.indexOf(target) + (after ? 1 : 0)
    list.set([...rest.slice(0, at), key, ...rest.slice(at)])
    return true
  }
}

export { arrayReorder }
