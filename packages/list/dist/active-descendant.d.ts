/**
 * The element that keeps focus names the active item with `aria-activedescendant`, so a screen reader follows the
 * item while focus stays put. It is a facet: it names a key only when render applies it to that key's element, and
 * stops naming it when the key changes or the element is dropped, so it never names an element that isn't drawn.
 */
export type Active<K> = Readonly<{
    get: () => K | undefined;
    watch: (listener: () => void) => () => void;
}>;
export type ActiveDescendantOptions<K> = Readonly<{
    element: Element;
    active: Active<K>;
    idOf: (key: K) => string;
}>;
/**
 * The active key, and hearing it change
 * @template K
 * @typedef {Readonly<{ get: () => K | undefined, watch: (listener: () => void) => () => void }>} Active
 */
/**
 * @template K
 * @typedef {Readonly<{ element: Element, active: Active<K>, idOf: (key: K) => string }>} ActiveDescendantOptions
 */
/**
 * Names the active key's element on the element with focus
 * @template K
 * @param {ActiveDescendantOptions<K>} options - The element with focus, the active key, and a key's element id
 * @returns {Readonly<{ apply: (key: K, item: Element) => void, drop: (key: K) => void,
 *   watch: (listener: (keys?: readonly K[]) => void) => () => void }>} The facet
 */
declare function activeDescendant<K>({ active, element, idOf }: ActiveDescendantOptions<K>): Readonly<{
    apply: (key: K, item: Element) => void;
    drop: (key: K) => void;
    watch: (listener: (keys?: readonly K[]) => void) => () => void;
}>;
export { activeDescendant };
