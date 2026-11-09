/**
 * Moving an item next to another, in a list in memory.
 */
/**
 * @template K
 * @param {Readonly<{ keys: () => readonly K[], set: (keys: readonly K[]) => void }>} list - The list
 * @returns {(key: K, target: K, after: boolean) => void} Moves `key` just after or before `target`; nothing if
 *   either isn't in the list
 */
declare function arrayReorder<K>(list: Readonly<{
    keys: () => readonly K[];
    set: (keys: readonly K[]) => void;
}>): (key: K, target: K, after: boolean) => void;
export { arrayReorder };
