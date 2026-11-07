/**
 * The arithmetic of showing billions of rows in a scroll area a browser can make: at most `cap` rows are scrollable,
 * and an offset says which position the first of them is. Positions are exact; pixels only ever say which of the
 * virtual rows is at the top.
 */

/**
 * The tallest scrollable area every browser makes, in pixels on screen: Firefox 157's 17,895,696, the smallest of the
 * three measured (Chrome 156 and WebKit 27.2 make 33,554,428). Taller, Firefox collapses the area to nothing; CSS zoom
 * divides the limit in CSS pixels, so it is compared with a row's height on screen.
 */
const MAX_SCROLL_PIXELS = 17_895_696
/** Scrollable rows before a row has been measured, as on the server: under the limit for rows up to 1,789px. */
const UNMEASURED_ROWS = 10_000
/** Pixels of a row that may be scrolled past before the row is no longer the top one, against rounding. */
const SLACK = 0.5

/**
 * How many rows can be scrollable, for rows laid out at a pitch on screen: one fewer than fit, against the browser
 * rounding the area's height.
 * @param {number} screenPitch - How far apart rows are on screen, in pixels, zoom included
 * @returns {number} The cap
 */
function rowCap(screenPitch) {
  return Math.max(1, Math.floor(MAX_SCROLL_PIXELS / screenPitch) - 1)
}

/**
 * How many rows are scrollable for a count.
 * @param {number} count - How many items there are
 * @param {number} cap - How many rows can be scrollable
 * @returns {number} The scrollable rows
 */
function virtualRows(count, cap) {
  return Math.min(count, cap)
}

/**
 * A number kept between two bounds.
 * @param {number} value - The number
 * @param {number} low - The lowest it may be
 * @param {number} high - The highest it may be, at least `low`
 * @returns {number} The number, kept inside
 */
function clamp(value, low, high) {
  return Math.min(Math.max(value, low), high)
}

/**
 * Where a list is: the offset now (none before the first placement), the position at the top, how many items there
 * are, how many rows show, and how many rows can be scrollable.
 * @typedef {Readonly<{ offset: number | undefined, top: number, count: number, rows: number, cap: number }>} Placement
 */

/**
 * The offset that puts `top` in the middle of the scrollable rows, or as near as the ends allow.
 * @param {Placement} placement - Where the list is
 * @returns {number} The position of the first scrollable row
 */
function centredOffset({ cap, count, rows, top }) {
  const scrollable = virtualRows(count, cap)
  return clamp(top - Math.floor((scrollable - rows) / 2), 0, count - scrollable)
}

/**
 * The offset to use for `top`: the current one while `top` is more than a quarter of the scrollable rows from either
 * end they can move toward, and otherwise one that centres it, so scrolling never reaches an end that isn't real.
 * @param {Placement} placement - Where the list is
 * @returns {number} The offset
 */
function offsetFor(placement) {
  const { cap, count, offset, rows, top } = placement
  if (offset === undefined) {
    return centredOffset(placement)
  }
  const scrollable = virtualRows(count, cap)
  const margin = Math.floor(scrollable / 4)
  const row = top - offset
  const nearStart = row < margin && offset > 0
  const nearEnd = row > scrollable - rows - margin && offset < count - scrollable
  const outside = row < 0 || row > scrollable - rows || offset < 0 || offset > count - scrollable
  return nearStart || nearEnd || outside ? centredOffset(placement) : offset
}

/**
 * The scrollable row a scroll position shows at the top.
 * @param {number} scrollTop - Pixels scrolled
 * @param {number} rowHeight - Pixels in a row, in the same units as `scrollTop`: the row's own CSS pixels
 * @returns {number} The row
 */
function rowAt(scrollTop, rowHeight) {
  return Math.floor((scrollTop + SLACK) / rowHeight)
}

export { MAX_SCROLL_PIXELS, UNMEASURED_ROWS, clamp, offsetFor, rowAt, rowCap, virtualRows }
