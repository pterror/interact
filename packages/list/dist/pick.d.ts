/**
 * A click on an item hands its key on.
 */
export type PickOptions<K> = Readonly<{
    element: EventTarget;
    itemOf: (target: EventTarget | null) => Readonly<{
        key: K;
    }> | undefined;
    to: (key: K) => void;
}>;
/**
 * @template K
 * @typedef {Readonly<{
 *   element: EventTarget,
 *   itemOf: (target: EventTarget | null) => Readonly<{ key: K }> | undefined,
 *   to: (key: K) => void,
 * }>} PickOptions
 */
/**
 * Hands on the key of each item clicked
 * @template K
 * @param {PickOptions<K>} options - Where clicks are heard, the item a click's target is in, and where its key goes
 * @returns {() => void} Stops
 */
declare function pick<K>({ element, itemOf, to }: PickOptions<K>): () => void;
export { pick };
