/**
 * The key under the pointer, handed on once the pointer rests on its item, so moving across a menu opens only the
 * submenu it stops at. A move restarts the wait; leaving the element ends it.
 */
export type HoverIntentOptions<K> = Readonly<{
    element: EventTarget;
    itemOf: (target: EventTarget | null) => Readonly<{
        key: K;
    }> | undefined;
    to: (key: K) => void;
    rest?: number;
}>;
/**
 * @template K
 * @typedef {Readonly<{
 *   element: EventTarget,
 *   itemOf: (target: EventTarget | null) => Readonly<{ key: K }> | undefined,
 *   to: (key: K) => void,
 *   rest?: number,
 * }>} HoverIntentOptions
 */
/**
 * Hands on the key the pointer rests on
 * @template K
 * @param {HoverIntentOptions<K>} options - Where the pointer is followed, the item a target is in, where its key goes,
 *   and how long it rests first (default 100 ms)
 * @returns {() => void} Stops
 */
declare function hoverIntent<K>({ element, itemOf, rest, to }: HoverIntentOptions<K>): () => void;
export { hoverIntent };
