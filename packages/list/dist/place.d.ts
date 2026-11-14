/**
 * Places each element where the layout puts its rank, so no element moves another. A list counted from its bottom (rank
 * 0 lowest, as a chat is) places from the container's bottom edge.
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
    edge?: 'top' | 'bottom';
}>;
/**
 * Where an item goes, in pixels: `y` from the container's edge the list is counted from to the item's edge on that
 * side; no width means as wide as the container, no height as tall as its content
 * @typedef {Readonly<{ x: number, y: number, width?: number, height?: number }>} Rect
 */
/**
 * @template K
 * @typedef {Readonly<{
 *   rank: Readonly<{ rank: (key: K) => number | undefined, watchRanks: (listener: () => void) => () => void }>,
 *   layout: Readonly<{ place: (rank: number) => Rect, watch: (listener: () => void) => () => void }>,
 *   edge?: 'top' | 'bottom',
 * }>} PlaceOptions
 */
/**
 * Places elements by rank. The container is their containing block
 * @template K
 * @param {PlaceOptions<K>} options - Each drawn key's rank, the layout, and the edge the list is counted from (`top`
 *   by default; `bottom`, the layout's `y` read up from the container's bottom)
 * @returns {Readonly<{ apply: (key: K, element: Element) => void,
 *   watch: (listener: (keys?: readonly K[]) => void) => () => void }>} The facet
 */
declare function place<K>({ edge, layout, rank }: PlaceOptions<K>): Readonly<{
    apply: (key: K, element: Element) => void;
    watch: (listener: (keys?: readonly K[]) => void) => () => void;
}>;
export { place };
