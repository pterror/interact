/**
 * Measures each drawn element's height and hands it on with its key and rank, when it changes size and when ranks
 * change, so heights follow their items.
 */
export type MeasureOptions<K> = Readonly<{
    rank: Readonly<{
        rank: (key: K) => number | undefined;
        watchRanks: (listener: () => void) => () => void;
    }>;
    measure: (key: K, rank: number, height: number) => void;
}>;
/**
 * @template K
 * @typedef {Readonly<{
 *   rank: Readonly<{ rank: (key: K) => number | undefined, watchRanks: (listener: () => void) => () => void }>,
 *   measure: (key: K, rank: number, height: number) => void,
 * }>} MeasureOptions
 */
/**
 * Measures elements that have a rank
 * @template K
 * @param {MeasureOptions<K>} options - Each drawn key's rank, and where heights go
 * @returns {Readonly<{ apply: (key: K, element: Element) => void, drop: (key: K, element: Element) => void,
 *   watch: () => () => void }>} The facet; it never asks render to apply it again
 */
declare function measure<K>({ measure: measured, rank }: MeasureOptions<K>): Readonly<{
    apply: (key: K, element: Element) => void;
    drop: (key: K, element: Element) => void;
    watch: () => () => void;
}>;
export { measure };
