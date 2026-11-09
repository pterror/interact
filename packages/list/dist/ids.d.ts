/**
 * Each element's id, from its key: what `aria-activedescendant` names.
 */
/**
 * Gives elements ids
 * @template K
 * @param {(key: K) => string} idOf - A key's id, unique in the page
 * @returns {Readonly<{ apply: (key: K, element: Element) => void, watch: () => () => void }>} The facet; an id
 *   never changes
 */
declare function ids<K>(idOf: (key: K) => string): Readonly<{
    apply: (key: K, element: Element) => void;
    watch: () => () => void;
}>;
export { ids };
