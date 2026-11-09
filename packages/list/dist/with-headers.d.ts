/**
 * Keys to draw with a header row before each group's first key. The keys of a group must come together.
 */
export type Drawn<K> = Readonly<{
    keys: () => readonly K[];
    watch: (listener: () => void) => () => void;
}>;
export type WithHeadersOptions<K, G> = Readonly<{
    drawn: Drawn<K>;
    groupOf: (key: K) => G;
    headerOf: (group: G) => K;
}>;
/**
 * @template K
 * @typedef {Readonly<{ keys: () => readonly K[], watch: (listener: () => void) => () => void }>} Drawn
 */
/**
 * @template K, G
 * @typedef {Readonly<{ drawn: Drawn<K>, groupOf: (key: K) => G, headerOf: (group: G) => K }>} WithHeadersOptions
 */
/**
 * Adds a header row before each group
 * @template K, G
 * @param {WithHeadersOptions<K, G>} options - The keys, each key's group, and each group's header key
 * @returns {Drawn<K>} The keys with headers
 */
declare function withHeaders<K, G>({ drawn, groupOf, headerOf }: WithHeadersOptions<K, G>): Drawn<K>;
export { withHeaders };
