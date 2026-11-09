/**
 * Tells a screen reader where each option is among all of them, drawn or not.
 */
export type Watched<T> = Readonly<{
    get: () => T;
    watch: (listener: () => void) => () => void;
}>;
export type PosInSetOptions<K> = Readonly<{
    position: Readonly<{
        rank: (key: K) => number | undefined;
        watchRanks: (listener: () => void) => () => void;
    }>;
    count: Watched<number>;
}>;
/**
 * @template T
 * @typedef {Readonly<{ get: () => T, watch: (listener: () => void) => () => void }>} Watched
 */
/**
 * @template K
 * @typedef {Readonly<{
 *   position: Readonly<{ rank: (key: K) => number | undefined, watchRanks: (listener: () => void) => () => void }>,
 *   count: Watched<number>,
 * }>} PosInSetOptions
 */
/**
 * Sets `aria-posinset` and `aria-setsize` on each option; an element with no position gets neither
 * @template K
 * @param {PosInSetOptions<K>} options - Each key's position among the options from 0, and how many there are
 * @returns {Readonly<{ apply: (key: K, element: Element) => void,
 *   watch: (listener: (keys?: readonly K[]) => void) => () => void }>} The facet
 */
declare function posInSet<K>({ count, position }: PosInSetOptions<K>): Readonly<{
    apply: (key: K, element: Element) => void;
    watch: (listener: (keys?: readonly K[]) => void) => () => void;
}>;
export { posInSet };
