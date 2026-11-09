/**
 * Every drawn item, across every render this facet is given to: the innermost item an event target is in, when
 * lists are drawn inside each other's items.
 */
export type Items<K> = Readonly<{
    apply: (key: K, element: Element) => void;
    drop: (key: K, element: Element) => void;
    watch: () => () => void;
    itemOf: (target: EventTarget | null) => Readonly<{
        key: K;
        element: Element;
    }> | undefined;
}>;
/**
 * @template K
 * @typedef {Readonly<{
 *   apply: (key: K, element: Element) => void,
 *   drop: (key: K, element: Element) => void,
 *   watch: () => () => void,
 *   itemOf: (target: EventTarget | null) => Readonly<{ key: K, element: Element }> | undefined,
 * }>} Items
 */
/**
 * Notes items as render draws them
 * @template K
 * @returns {Items<K>} The facet, and the innermost item an event target is in
 */
declare function items<K>(): Items<K>;
export { items };
