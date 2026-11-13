/**
 * An element's bottom in its scroll container's content, followed as it or what is above it changes size.
 */
/**
 * @param {Element} element - The element
 * @param {Element} container - The scroll container it is in
 * @returns {Readonly<{ get: () => number, watch: (listener: () => void) => () => void }>} Its bottom, in pixels from
 *   the top of the container's content; heard when the element or one of the container's children changes size
 */
declare function bottomIn(element: Element, container: Element): Readonly<{
    get: () => number;
    watch: (listener: () => void) => () => void;
}>;
export { bottomIn };
