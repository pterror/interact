/**
 * An element's top, or its bottom, in its scroll container's content, followed as it or what is above it changes size.
 */
/**
 * @param {Element} element - The element
 * @param {Element} container - The scroll container it is in
 * @param {'top' | 'bottom'} [edge] - Which of its edges (`top` by default)
 * @returns {Readonly<{ get: () => number, watch: (listener: () => void) => () => void }>} The edge, in pixels from the
 *   top of the container's content; heard when the element or one of the container's children changes size
 */
declare function topIn(element: Element, container: Element, edge?: 'top' | 'bottom'): Readonly<{
    get: () => number;
    watch: (listener: () => void) => () => void;
}>;
export { topIn };
