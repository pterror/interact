/**
 * Each key's rank, at once, from a list in memory.
 */
/**
 * @template K
 * @param {Readonly<{ keys: () => readonly K[], watch: (listener: () => void) => () => void }>} list - The list
 * @returns {Readonly<{ rank: (key: K) => number | undefined, watchRanks: (listener: () => void) => () => void }>} A
 *   key's rank, and hearing ranks change
 */
declare function arrayRank<K>(list: Readonly<{
    keys: () => readonly K[];
    watch: (listener: () => void) => () => void;
}>): Readonly<{
    rank: (key: K) => number | undefined;
    watchRanks: (listener: () => void) => () => void;
}>;
export { arrayRank };
