/**
 * The key beside each key on one side, asked of a Step when it is first wanted and kept. Answers may come late and in
 * any order: a key takes only the answer to its latest question, and keeps its last answer until a newer one comes, so
 * what is shown doesn't flicker while the list asks again after a change.
 */
export type Step<K> = Readonly<{
    step: (key: K, by: number) => Promise<K | undefined>;
}>;
export type Changes<K> = Readonly<{
    watch: (listener: (keys?: readonly K[]) => void) => () => void;
}>;
export type AdjacentOptions<K> = Readonly<{
    step: Step<K>;
    by: 1 | -1;
    changes: Changes<K>;
}>;
export type Adjacent<K> = Readonly<{
    of: (key: K) => Readonly<{
        key: K | undefined;
    }> | undefined;
    watch: (listener: (keys?: readonly K[]) => void) => () => void;
}>;
/**
 * The key `by` keys on from `key`, stopping at the edge (so `key` itself at the edge)
 * @template K
 * @typedef {Readonly<{ step: (key: K, by: number) => Promise<K | undefined> }>} Step
 */
/**
 * Hearing the keys whose neighbour may have changed (none: any)
 * @template K
 * @typedef {Readonly<{ watch: (listener: (keys?: readonly K[]) => void) => () => void }>} Changes
 */
/**
 * @template K
 * @typedef {Readonly<{ step: Step<K>, by: 1 | -1, changes: Changes<K> }>} AdjacentOptions
 */
/**
 * A key's neighbour: `undefined` until known, then `{ key }`, whose key is none at the list's edge; and hearing the
 * keys whose neighbour became known or changed
 * @template K
 * @typedef {Readonly<{
 *   of: (key: K) => Readonly<{ key: K | undefined }> | undefined,
 *   watch: (listener: (keys?: readonly K[]) => void) => () => void,
 * }>} Adjacent
 */
/**
 * Follows each key's neighbour
 * @template K
 * @param {AdjacentOptions<K>} options - The Step, which way the neighbour is (`-1`: the key before), and hearing the
 *   list change
 * @returns {Adjacent<K>} Each key's neighbour, asked for the first time it is wanted
 */
declare function adjacent<K>({ by, changes, step }: AdjacentOptions<K>): Adjacent<K>;
export { adjacent };
