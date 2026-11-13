/**
 * Places each element where the layout puts its rank, counted from the container's bottom (rank 0 lowest, as a chat
 * is), so no element moves another.
 */
export type Rect = Readonly<{
    x: number;
    y: number;
    width?: number;
    height?: number;
}>;
export type PlaceFromBottomOptions<K> = Readonly<{
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
 * Where an item goes, in pixels: `y` from the container's bottom to the item's bottom; no width means as wide as the
 * container, no height as tall as its content
 * @typedef {Readonly<{ x: number, y: number, width?: number, height?: number }>} Rect
 */
/**
 * @template K
 * @typedef {Readonly<{
 *   rank: Readonly<{ rank: (key: K) => number | undefined, watchRanks: (listener: () => void) => () => void }>,
 *   layout: Readonly<{ place: (rank: number) => Rect, watch: (listener: () => void) => () => void }>,
 * }>} PlaceFromBottomOptions
 */
/**
 * Places elements by rank from the bottom. The container is their containing block
 * @template K
 * @param {PlaceFromBottomOptions<K>} options - Each drawn key's rank, and the layout
 * @returns {Readonly<{ apply: (key: K, element: Element) => void,
 *   watch: (listener: (keys?: readonly K[]) => void) => () => void }>} The facet
 */
declare function placeFromBottom<K>({ layout, rank }: PlaceFromBottomOptions<K>): Readonly<{
    apply: (key: K, element: Element) => void;
    watch: (listener: (keys?: readonly K[]) => void) => () => void;
}>;
export { placeFromBottom };
