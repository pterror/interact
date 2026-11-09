/**
 * The keys at ranks, from a list in memory.
 */
/**
 * @template K
 * @param {Readonly<{ keys: () => readonly K[], watch: (listener: () => void) => () => void }>} list - The list
 * @returns {Readonly<{ keysAt: (from: number, to: number) => Promise<readonly K[]>,
 *   watch: (listener: () => void) => () => void }>} The keys from rank `from` up to `to`, and hearing them change
 */
declare function arrayKeysAt<K>(list: Readonly<{
    keys: () => readonly K[];
    watch: (listener: () => void) => () => void;
}>): Readonly<{
    keysAt: (from: number, to: number) => Promise<readonly K[]>;
    watch: (listener: () => void) => () => void;
}>;
export { arrayKeysAt };
