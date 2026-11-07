/**
 * Where a pointer heading for a submenu may pass without meaning to leave it: the area between where the pointer left
 * the item that opened the submenu and the submenu's near edge, and the submenu itself. A pointer moving diagonally
 * toward the submenu crosses other items of its menu on the way; while it stays inside this area, those crossings
 * don't close the submenu.
 * @import { Rect } from './placement.js'
 */

/** @typedef {Readonly<{ x: number, y: number }>} Point */

/** Pixels the area's tip is moved back behind the pointer, so a pointer that pauses on its way stays inside. */
const BLEED = 5

/**
 * The area a pointer heading for a submenu may pass through: a polygon from a point just behind where it is now, to
 * the corners of the submenu's near edge, round the submenu's far corners.
 * @param {Point} pointer - Where the pointer is
 * @param {Rect} submenu - Where the submenu is
 * @returns {readonly Point[]} The polygon's corners, in order
 */
function intentArea(pointer, submenu) {
  const left = submenu.x
  const right = submenu.x + submenu.width
  const top = submenu.y
  const bottom = submenu.y + submenu.height
  const toRight = left >= pointer.x
  const [near, far] = toRight ? [left, right] : [right, left]
  const tip = { x: pointer.x + (toRight ? -BLEED : BLEED), y: pointer.y }
  return [tip, { x: near, y: top }, { x: far, y: top }, { x: far, y: bottom }, { x: near, y: bottom }]
}

/**
 * Whether a point is inside a polygon, counting how many of its edges a ray from the point crosses.
 * @param {Point} point - The point
 * @param {readonly Point[]} polygon - The polygon's corners, in order
 * @returns {boolean} Whether it is inside
 */
function insideArea(point, polygon) {
  let inside = false
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const from = polygon[index]
    const to = polygon[previous]
    if (from !== undefined && to !== undefined && from.y > point.y !== to.y > point.y) {
      const crossing = ((to.x - from.x) * (point.y - from.y)) / (to.y - from.y) + from.x
      inside = point.x < crossing ? !inside : inside
    }
  }
  return inside
}

export { insideArea, intentArea }
