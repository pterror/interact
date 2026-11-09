/**
 * An element's inner width, followed as it changes.
 */
/**
 * @param {Element} element - The element
 * @returns {Readonly<{ get: () => number, watch: (listener: () => void) => () => void }>} Its width in pixels
 */
declare function widthOf(element: Element): Readonly<{
    get: () => number;
    watch: (listener: () => void) => () => void;
}>;
export { widthOf };
