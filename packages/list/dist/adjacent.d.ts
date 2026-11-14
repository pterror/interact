/**
 * The key beside each key on one side, asked of a Step when it is first wanted and kept while the key is drawn. Answers
 * may come late and in any order: a key takes only the answer to its latest question, and keeps its last answer until a
 * newer one comes, so what is shown doesn't flicker while the list asks again after a change. A key no longer drawn is
 * let go of, as `windowing` lets go of its rank, and asked about again if it is wanted again.
 */
export type Step<K> = (key: K, by: number) => Promise<K | undefined>;
export type Changes<K> = Readonly<{
    watch: (listener: (keys?: readonly K[]) => void) => () => void;
}>;
export type Drawn<K> = Readonly<{
    keys: () => readonly K[];
    watch: (listener: () => void) => () => void;
}>;
export type AdjacentOptions<K> = Readonly<{
    step: Step<K>;
    by: 1 | -1;
    changes: Changes<K>;
    drawn: Drawn<K>;
}>;
export type Adjacent<K> = Readonly<{
    of: (key: K) => Readonly<{
        key: K | undefined;
    }> | undefined;
    watch: (listener: (keys?: readonly K[]) => void) => () => void;
    stop: () => void;
}>;
/**
 * The key `by` keys on from `key`, stopping at the edge (so `key` itself at the edge)
 * @template K
 * @typedef {(key: K, by: number) => Promise<K | undefined>} Step
 */
/**
 * Hearing the keys whose neighbour may have changed (none: any)
 * @template K
 * @typedef {Readonly<{ watch: (listener: (keys?: readonly K[]) => void) => () => void }>} Changes
 */
/**
 * The keys drawn, and hearing them change
 * @template K
 * @typedef {Readonly<{ keys: () => readonly K[], watch: (listener: () => void) => () => void }>} Drawn
 */
/**
 * @template K
 * @typedef {Readonly<{ step: Step<K>, by: 1 | -1, changes: Changes<K>, drawn: Drawn<K> }>} AdjacentOptions
 */
/**
 * A key's neighbour: `undefined` until known, then `{ key }`, whose key is none at the list's edge; hearing the keys
 * whose neighbour became known or changed; and stopping
 * @template K
 * @typedef {Readonly<{
 *   of: (key: K) => Readonly<{ key: K | undefined }> | undefined,
 *   watch: (listener: (keys?: readonly K[]) => void) => () => void,
 *   stop: () => void,
 * }>} Adjacent
 */
/**
 * Follows each key's neighbour
 * @template K
 * @param {AdjacentOptions<K>} options - The Step, which way the neighbour is (`-1`: the key before), hearing the list
 *   change, and the keys drawn
 * @returns {Adjacent<K>} Each key's neighbour, asked for the first time it is wanted
 */
declare function adjacent<K>({ by, changes, drawn, step }: AdjacentOptions<K>): Adjacent<K>;
export { adjacent };
