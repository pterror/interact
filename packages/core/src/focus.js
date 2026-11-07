/**
 * Where focus goes on entering a collection: back to the position it left, while that is still inside, otherwise the
 * first. Nowhere in an empty collection.
 * @param {number | undefined} left - The position focus was last at
 * @param {number} count - How many items there are
 * @returns {number | undefined} The position to focus
 */
function entry(left, count) {
  if (count < 1) {
    return undefined
  }
  if (left === undefined || left >= count) {
    return 0
  }
  return left
}

/**
 * A position moved by `by`, kept inside the collection.
 * @param {number} position - Where it is
 * @param {number} by - How far to move, back when negative
 * @param {number} count - How many items there are, at least one
 * @returns {number} Where it ends up
 */
function move(position, by, count) {
  return Math.min(Math.max(position + by, 0), count - 1)
}

export { entry, move }
