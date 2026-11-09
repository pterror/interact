/**
 * Where a drop would land: before or after the drawn item under a point, by which half of it the point is in.
 */
export type GapsOptions<K> = Readonly<{
    itemOf: (target: EventTarget | null) => Readonly<{
        key: K;
        element: Element;
    }> | undefined;
    axis: 'x' | 'y';
}>;
export type Gap<K> = Readonly<{
    target: K;
    after: boolean;
}>;
/**
 * @template K
 * @typedef {Readonly<{
 *   itemOf: (target: EventTarget | null) => Readonly<{ key: K, element: Element }> | undefined,
 *   axis: 'x' | 'y',
 * }>} GapsOptions
 */
/**
 * A drop's place: next to `target`, after it or before it
 * @template K
 * @typedef {Readonly<{ target: K, after: boolean }>} Gap
 */
/**
 * Finds the gap at a point
 * @template K
 * @param {GapsOptions<K>} options - The item an element is in, and which way the items run: down a list (`y`) or
 *   across a row of cards (`x`)
 * @returns {(point: Readonly<{ x: number, y: number }>) => Gap<K> | undefined} The gap at a point in the viewport,
 *   none away from every item
 */
declare function gaps<K>({ axis, itemOf }: GapsOptions<K>): (point: Readonly<{
    x: number;
    y: number;
}>) => Gap<K> | undefined;
export { gaps };
