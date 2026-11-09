/**
 * A Step from one hop the list's source answers, now or later: the parent of a key, its first child, or any such
 * relation. `step(k, n)` takes `n` hops and stops where the source has no answer, staying on the last key reached; from
 * none it stays at none.
 */
/**
 * @template K
 * @param {(key: K) => Promise<K | undefined>} relation - The key one hop on from another, if there is one
 * @returns {(from: K | undefined, by: number) => Promise<K | undefined>} The Step
 */
declare function relationStep<K>(relation: (key: K) => Promise<K | undefined>): (from: K | undefined, by: number) => Promise<K | undefined>;
export { relationStep };
