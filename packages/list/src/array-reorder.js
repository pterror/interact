/**
 * Moving an item next to another, in a list in memory.
 */

/**
 * @template K
 * @param {Readonly<{ keys: () => readonly K[], set: (keys: readonly K[]) => void }>} list - The list
 * @returns {(key: K, target: K, after: boolean) => void} Moves `key` just after or before `target`; nothing if
 *   either isn't in the list
 */
function arrayReorder(list) {
  return (key, target, after) => {
    const all = list.keys()
    if (key === target || !all.includes(key) || !all.includes(target)) {
      return
    }
    const rest = all.filter((each) => each !== key)
    const at = rest.indexOf(target) + (after ? 1 : 0)
    list.set([...rest.slice(0, at), key, ...rest.slice(at)])
  }
}

export { arrayReorder }
