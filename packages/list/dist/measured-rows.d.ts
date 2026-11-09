/**
 * A layout of rows as tall as their content: each row is taken to be an estimated height until it is measured. Only
 * measured rows cost anything; the rest are worked out from the estimate, so the list can be any length. A height is
 * kept with the key it was measured for, at the rank that key was last seen at, so it moves with its item when the list
 * changes; a key seen at a rank another held displaces it.
 */
export type Rect = Readonly<{
    x: number;
    y: number;
    width?: number;
    height?: number;
}>;
export type MeasuredRows<K> = Readonly<{
    ranksIn: (start: number, end: number, count: number) => Readonly<{
        from: number;
        to: number;
    }>;
    place: (rank: number) => Rect;
    extent: (count: number) => Readonly<{
        height: number;
    }>;
    watch: (listener: () => void) => () => void;
    measure: (key: K, rank: number, height: number) => void;
}>;
/**
 * Rows as tall as their content
 * @template K
 * @param {number} estimate - The height in pixels a row is taken to be until measured
 * @returns {MeasuredRows<K>} The layout; `measure` gives a key's rank and height
 */
declare function measuredRows<K>(estimate: number): MeasuredRows<K>;
export { measuredRows };
