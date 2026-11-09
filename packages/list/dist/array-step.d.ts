/**
 * Stepping through keys held in an array: the key `n` on from another, stopping at the ends.
 */
/**
 * Steps through the array a function gives: `step(none, 1)` is the first key, `step(none, -1)` the last, `step(k, n)`
 * the key `n` on from `k`, stopping at the ends. A key not in the array steps as none. Answers later, as any Step may
 * @template K
 * @param {() => readonly K[]} keys - The keys now
 * @returns {(from: K | undefined, by: number) => Promise<K | undefined>} The Step
 */
declare function arrayStep<K>(keys: () => readonly K[]): (from: K | undefined, by: number) => Promise<K | undefined>;
export { arrayStep };
