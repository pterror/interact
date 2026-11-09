/**
 * Scrolls the part of a key's element that stands for the item into view when the key changes; the element itself when
 * the app names no part.
 */
export type Target<K> = Readonly<{
    get: () => K | undefined;
    watch: (listener: () => void) => () => void;
}>;
export type RevealPartOptions<K> = Readonly<{
    target: Target<K>;
    part: (key: K, element: Element) => Element | undefined;
}>;
/**
 * A key, and hearing it change
 * @template K
 * @typedef {Readonly<{ get: () => K | undefined, watch: (listener: () => void) => () => void }>} Target
 */
/**
 * @template K
 * @typedef {Readonly<{ target: Target<K>, part: (key: K, element: Element) => Element | undefined }>}
 *   RevealPartOptions
 */
/**
 * Reveals the part of a key's element that stands for it, each time the key changes
 * @template K
 * @param {RevealPartOptions<K>} options - The key to reveal, and the part of its element to scroll into view
 * @returns {Readonly<{ apply: (key: K, element: Element) => void,
 *   watch: (listener: (keys?: readonly K[]) => void) => () => void }>} The facet
 */
declare function revealPart<K>({ part, target }: RevealPartOptions<K>): Readonly<{
    apply: (key: K, element: Element) => void;
    watch: (listener: (keys?: readonly K[]) => void) => () => void;
}>;
export { revealPart };
