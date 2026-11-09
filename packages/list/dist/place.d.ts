/**
 * Places each element where the layout puts its rank, so no element moves another.
 */
export type Rect = Readonly<{
    x: number;
    y: number;
    width?: number;
    height?: number;
}>;
export type PlaceOptions<K> = Readonly<{
    rank: Readonly<{
        rank: (key: K) => number | undefined;
        watchRanks: (listener: () => void) => () => void;
    }>;
    layout: Readonly<{
        place: (rank: number) => Rect;
        watch: (listener: () => void) => () => void;
    }>;
}>;
/**
 * Where an item goes, in pixels; no width means as wide as the container, no height as tall as its content
 * @typedef {Readonly<{ x: number, y: number, width?: number, height?: number }>} Rect
 */
/**
 * @template K
 * @typedef {Readonly<{
 *   rank: Readonly<{ rank: (key: K) => number | undefined, watchRanks: (listener: () => void) => () => void }>,
 *   layout: Readonly<{ place: (rank: number) => Rect, watch: (listener: () => void) => () => void }>,
 * }>} PlaceOptions
 */
/**
 * Places elements by rank. The container is their containing block
 * @template K
 * @param {PlaceOptions<K>} options - Each drawn key's rank, and the layout
 * @returns {Readonly<{ apply: (key: K, element: Element) => void,
 *   watch: (listener: (keys?: readonly K[]) => void) => () => void }>} The facet
 */
declare function place<K>({ layout, rank }: PlaceOptions<K>): Readonly<{
    apply: (key: K, element: Element) => void;
    watch: (listener: (keys?: readonly K[]) => void) => () => void;
}>;
export { place };
