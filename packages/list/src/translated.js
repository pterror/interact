/**
 * How far an element is drawn from where it is laid out by its `translate` property, as it is now, part-way through
 * any animation of it.
 */

/**
 * The element's translation now
 * @param {Element} element - The element
 * @returns {Readonly<{ x: number, y: number }>} Across and down, in CSS pixels
 */
function translated(element) {
  const value = getComputedStyle(element).translate
  if (typeof value !== 'string' || value === '' || value === 'none') {
    return { x: 0, y: 0 }
  }
  const [x = 0, y = 0] = value.split(' ').map((part) => Number(part.replace(/px$/u, '')) || 0)
  return { x, y }
}

/**
 * Where the element is laid out along an axis, ignoring its translation
 * @param {Element} element - The element
 * @param {'x' | 'y'} axis - Which way
 * @returns {Readonly<{ start: number, size: number }>} Its start in the viewport and its size, in CSS pixels
 */
function laidOut(element, axis) {
  const rect = element.getBoundingClientRect()
  const by = translated(element)[axis]
  return axis === 'x' ? { size: rect.width, start: rect.left - by } : { size: rect.height, start: rect.top - by }
}

export { laidOut, translated }
