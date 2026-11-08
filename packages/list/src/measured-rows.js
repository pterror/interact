/**
 * A layout of rows as tall as their content: each row is taken to be an estimated height until it is measured. Only
 * measured rows cost anything; the rest are worked out from the estimate, so the list can be any length.
 */

/**
 * @typedef {Readonly<{ x: number, y: number, width?: number, height?: number }>} Rect
 */

/**
 * @typedef {Readonly<{
 *   ranksIn: (start: number, end: number, count: number) => Readonly<{ from: number, to: number }>,
 *   place: (rank: number) => Rect,
 *   extent: (count: number) => Readonly<{ height: number }>,
 *   watch: (listener: () => void) => () => void,
 *   measure: (rank: number, height: number) => void,
 *   watchShifts: (listener: (top: number, by: number) => void) => () => void,
 * }>} MeasuredRows
 */

/**
 * The last index whose value is at most a target, in values that never go down; -1 if none is
 * @param {readonly number[]} values - The values
 * @param {number} target - The target
 * @returns {number} The index
 */
function lastAtMost(values, target) {
  let low = -1
  let high = values.length - 1
  while (low < high) {
    const middle = Math.ceil((low + high) / 2)
    if ((values[middle] ?? 0) <= target) {
      low = middle
    } else {
      high = middle - 1
    }
  }
  return low
}

/**
 * Rows as tall as their content
 * @param {number} estimate - The height in pixels a row is taken to be until measured
 * @returns {MeasuredRows} The layout; `measure` gives a row's height, and `watchShifts` hears that rows from a pixel
 *   down moved by some pixels, after `watch` has, so what sizes the scroll range already includes the change
 */
function measuredRows(estimate) {
  /** @type {Map<number, number>} */
  const heights = new Map()
  /** @type {{ ranks: readonly number[], below: readonly number[], total: number } | undefined} */
  let sums = undefined
  /** @type {Set<() => void>} */
  const listeners = new Set()
  /** @type {Set<(top: number, by: number) => void>} */
  const shifts = new Set()

  /** @returns {Readonly<{ ranks: readonly number[], below: readonly number[], total: number }>} The measured ranks in order, the extra height before each, and in all */
  const summed = () => {
    if (sums === undefined) {
      const ranks = [...heights.keys()].toSorted((one, other) => one - other)
      /** @type {number[]} */
      const below = []
      let total = 0
      for (const rank of ranks) {
        below.push(total)
        total += (heights.get(rank) ?? estimate) - estimate
      }
      sums = { below, ranks, total }
    }
    return sums
  }

  /**
   * Where a row starts
   * @param {number} rank - The row
   * @returns {number} Its top, in pixels
   */
  const top = (rank) => {
    const { below, ranks } = summed()
    const at = lastAtMost(ranks, rank - 1)
    const extra = at < 0 ? 0 : (below[at] ?? 0) + (heights.get(ranks[at] ?? 0) ?? estimate) - estimate
    return rank * estimate + extra
  }

  /**
   * The first rank whose row ends after a pixel
   * @param {number} y - The pixel
   * @param {number} count - How many rows
   * @returns {number} The rank
   */
  const rankAt = (y, count) => {
    let low = 0
    let high = count
    while (low < high) {
      const middle = Math.floor((low + high) / 2)
      if (top(middle + 1) <= y) {
        low = middle + 1
      } else {
        high = middle
      }
    }
    return low
  }

  return {
    extent: (count) => ({ height: count * estimate + summed().total }),
    measure(rank, height) {
      const before = heights.get(rank) ?? estimate
      if (before === height) {
        return
      }
      const at = top(rank)
      heights.set(rank, height)
      sums = undefined
      for (const listener of listeners) {
        listener()
      }
      for (const listener of shifts) {
        listener(at, height - before)
      }
    },
    place: (rank) => ({ x: 0, y: top(rank) }),
    ranksIn(start, end, count) {
      const from = rankAt(Math.max(start, 0), count)
      return { from, to: Math.min(rankAt(Math.max(end - 1, 0), count) + 1, count) }
    },
    watch(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    watchShifts(listener) {
      shifts.add(listener)
      return () => {
        shifts.delete(listener)
      }
    },
  }
}

export { measuredRows }
