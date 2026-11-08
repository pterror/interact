/**
 * Where a drop would land: before or after the drawn item under a point, by which half of it the point is in.
 */

/**
 * @template K
 * @typedef {Readonly<{
 *   itemOf: (target: EventTarget | null) => Readonly<{ key: K, element: Element }> | undefined,
 *   axis: 'x' | 'y',
 * }>} GapsOptions
 */

/**
 * A drop's place: next to `target`, after it or before it
 * @template K
 * @typedef {Readonly<{ target: K, after: boolean }>} Gap
 */

/**
 * Finds the gap at a point
 * @template K
 * @param {GapsOptions<K>} options - The item an element is in, and which way the items run: down a list (`y`) or
 *   across a row of cards (`x`)
 * @returns {(point: Readonly<{ x: number, y: number }>) => Gap<K> | undefined} The gap at a point in the viewport,
 *   none away from every item
 */
function gaps({ axis, itemOf }) {
  return (point) => {
    const item = itemOf(document.elementFromPoint(point.x, point.y))
    if (item === undefined) {
      return undefined
    }
    const rect = item.element.getBoundingClientRect()
    const after = axis === 'y' ? point.y > rect.top + rect.height / 2 : point.x > rect.left + rect.width / 2
    return { after, target: item.key }
  }
}

export { gaps }
