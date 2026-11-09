/**
 * A list that never changes, whose keys are worked out from their ranks rather than stored: as long as you like,
 * and nothing made for an item until it is asked for.
 */
export type Computed<K> = Readonly<{
    count: number;
    keyAt: (rank: number) => K;
}>;
/**
 * @template K
 * @typedef {Readonly<{ count: number, keyAt: (rank: number) => K }>} Computed
 */
/**
 * The keys at ranks
 * @template K
 * @param {Computed<K>} list - How many keys, and the key at a rank
 * @returns {Readonly<{ keysAt: (from: number, to: number) => Promise<readonly K[]>,
 *   watch: (listener: () => void) => () => void }>} The keys from rank `from` up to `to`; they never change
 */
declare function computedKeysAt<K>({ count, keyAt }: Computed<K>): Readonly<{
    keysAt: (from: number, to: number) => Promise<readonly K[]>;
    watch: (listener: () => void) => () => void;
}>;
/**
 * Steps through the keys, stopping at the ends, as `arrayStep` does
 * @template K
 * @param {Computed<K> & Readonly<{ rankOf: (key: K) => number | undefined }>} list - How many keys, the key at a rank,
 *   and a key's rank
 * @returns {(from: K | undefined, by: number) => Promise<K | undefined>} The Step
 */
declare function computedStep<K>({ count, keyAt, rankOf }: Computed<K> & Readonly<{
    rankOf: (key: K) => number | undefined;
}>): (from: K | undefined, by: number) => Promise<K | undefined>;
/**
 * A key's rank
 * @template K
 * @param {(key: K) => number | undefined} rankOf - A key's rank, if the list has it
 * @returns {(key: K) => Promise<number | undefined>} The Locate
 */
declare function computedLocate<K>(rankOf: (key: K) => number | undefined): (key: K) => Promise<number | undefined>;
export { computedKeysAt, computedLocate, computedStep };
