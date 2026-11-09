/**
 * How many keys a list in memory has.
 */
/**
 * @template K
 * @param {Readonly<{ keys: () => readonly K[], watch: (listener: () => void) => () => void }>} list - The list
 * @returns {Readonly<{ get: () => number, watch: (listener: () => void) => () => void }>} The count
 */
declare function arrayCount<K>(list: Readonly<{
    keys: () => readonly K[];
    watch: (listener: () => void) => () => void;
}>): Readonly<{
    get: () => number;
    watch: (listener: () => void) => () => void;
}>;
export { arrayCount };
