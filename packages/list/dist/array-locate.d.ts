/**
 * A key's rank, from a list in memory.
 */
/**
 * @template K
 * @param {() => readonly K[]} keys - The keys now
 * @returns {(key: K) => Promise<number | undefined>} A key's rank, if the list has it
 */
declare function arrayLocate<K>(keys: () => readonly K[]): (key: K) => Promise<number | undefined>;
export { arrayLocate };
