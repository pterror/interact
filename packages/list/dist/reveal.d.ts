/**
 * Scrolls a key's element into view when the key changes. It is a facet: the scroll happens when the element is
 * applied, so it doesn't matter whether the element existed when the key changed; and it waits for the end of that
 * pass, so every other facet (one that places the element, say) has been applied.
 */
export type Target<K> = Readonly<{
    get: () => K | undefined;
    watch: (listener: () => void) => () => void;
}>;
/**
 * A key, and hearing it change
 * @template K
 * @typedef {Readonly<{ get: () => K | undefined, watch: (listener: () => void) => () => void }>} Target
 */
/**
 * Reveals a key's element each time the key changes
 * @template K
 * @param {Target<K>} target - The key to reveal
 * @returns {Readonly<{ apply: (key: K, element: Element) => void,
 *   watch: (listener: (keys?: readonly K[]) => void) => () => void }>} The facet
 */
declare function reveal<K>(target: Target<K>): Readonly<{
    apply: (key: K, element: Element) => void;
    watch: (listener: (keys?: readonly K[]) => void) => () => void;
}>;
export { reveal };
