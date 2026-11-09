/**
 * Builds something inside an element once render has drawn it, such as a region's nested list, and stops it when
 * render drops the element.
 */
/**
 * @template K
 * @param {(key: K, element: Element) => (() => void) | undefined} build - Builds inside an element, if its key has
 *   anything to build; gives how to stop
 * @returns {Readonly<{ apply: (key: K, element: Element) => void, drop: (key: K, element: Element) => void,
 *   watch: () => () => void }>} The facet
 */
declare function nest<K>(build: (key: K, element: Element) => (() => void) | undefined): Readonly<{
    apply: (key: K, element: Element) => void;
    drop: (key: K, element: Element) => void;
    watch: () => () => void;
}>;
export { nest };
