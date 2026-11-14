/**
 * How far an element is drawn from where it is laid out by its `translate` property, as it is now, part-way through
 * any animation of it.
 */
/**
 * The element's translation now
 * @param {Element} element - The element
 * @returns {Readonly<{ x: number, y: number }>} Across and down, in CSS pixels
 */
declare function translated(element: Element): Readonly<{
    x: number;
    y: number;
}>;
/**
 * Where the element is laid out along an axis, ignoring its translation
 * @param {Element} element - The element
 * @param {'x' | 'y'} axis - Which way
 * @returns {Readonly<{ start: number, size: number }>} Its start in the viewport and its size, in CSS pixels
 */
declare function laidOut(element: Element, axis: 'x' | 'y'): Readonly<{
    start: number;
    size: number;
}>;
export { laidOut, translated };
