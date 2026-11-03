/**
 * The arithmetic of showing billions of rows in a scroll area a browser can make: at most `VIRTUAL_ROWS` rows are
 * scrollable, and an offset says which position the first of them is. Positions are exact; pixels only ever say which
 * of the virtual rows is at the top.
 */

/** How many rows are ever scrollable: 100,000 rows of 300px is 30,000,000px, under the 32,000,048px Chrome allows. */
const VIRTUAL_ROWS = 100_000
const NONE = 0
const HALF = 2
const QUARTER = 4
/** Pixels of a row that may be scrolled past before the row is no longer the top one, against rounding. */
const SLACK = 0.5

/**
 * How many rows are scrollable for a count.
 * @param {number} count - How many items there are
 * @returns {number} The scrollable rows
 */
function virtualRows(count) {
  return Math.min(count, VIRTUAL_ROWS)
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
 * The offset that puts `top` in the middle of the scrollable rows, or as near as the ends allow.
 * @param {number} top - The position at the top
 * @param {number} count - How many items there are
 * @param {number} rows - How many rows show at once
 * @returns {number} The position of the first scrollable row
 */
function centredOffset(top, count, rows) {
  const scrollable = virtualRows(count)
  return clamp(top - Math.floor((scrollable - rows) / HALF), NONE, count - scrollable)
}

/**
 * Where a list is: the offset now (none before the first placement), the position at the top, how many items there
 * are, and how many rows show.
 * @typedef {Readonly<{ offset: number | undefined, top: number, count: number, rows: number }>} Placement
 */

/**
 * The offset to use for `top`: the current one while `top` is more than a quarter of the scrollable rows from either
 * end they can move toward, and otherwise one that centres it, so scrolling never reaches an end that isn't real.
 * @param {Placement} placement - Where the list is
 * @returns {number} The offset
 */
function offsetFor({ count, offset, rows, top }) {
  if (offset === undefined) {
    return centredOffset(top, count, rows)
  }
  const scrollable = virtualRows(count)
  const margin = Math.floor(scrollable / QUARTER)
  const row = top - offset
  const nearStart = row < margin && offset > NONE
  const nearEnd = row > scrollable - rows - margin && offset < count - scrollable
  const outside = row < NONE || row > scrollable - rows || offset < NONE || offset > count - scrollable
  return nearStart || nearEnd || outside ? centredOffset(top, count, rows) : offset
}

/**
 * The scrollable row a scroll position shows at the top.
 * @param {number} scrollTop - Pixels scrolled
 * @param {number} rowHeight - Pixels in a row
 * @returns {number} The row
 */
function rowAt(scrollTop, rowHeight) {
  return Math.floor((scrollTop + SLACK) / rowHeight)
}

export { VIRTUAL_ROWS, clamp, offsetFor, rowAt, virtualRows }
