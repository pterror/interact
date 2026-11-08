/**
 * A layout of groups of cards: each group a header as wide as the container, then its cards in as many columns as the
 * width holds, row after row. Ranks run through the groups, each header's rank just before its cards'.
 */

/**
 * @template T
 * @typedef {Readonly<{ get: () => T, watch: (listener: () => void) => () => void }>} Watched
 */

/**
 * @typedef {Readonly<{ x: number, y: number, width?: number, height: number }>} Rect
 */

/**
 * @typedef {Readonly<{
 *   width: Watched<number>,
 *   sizes: Watched<readonly number[]>,
 *   cardWidth: number,
 *   cardHeight: number,
 *   headerHeight: number,
 * }>} GroupedCardsOptions
 */

/**
 * @typedef {Readonly<{
 *   ranksIn: (start: number, end: number, count: number) => Readonly<{ from: number, to: number }>,
 *   place: (rank: number) => Rect,
 *   extent: (count: number) => Readonly<{ height: number }>,
 *   watch: (listener: () => void) => () => void,
 *   columns: Watched<number>,
 *   rowStep: (rank: number | undefined, rows: number) => number | undefined,
 * }>} GroupedCards
 */

/**
 * Where each group starts, in ranks and pixels, and how many rows of cards it has
 * @typedef {Readonly<{ columns: number, starts: readonly number[], tops: readonly number[],
 *   rows: readonly number[], sizes: readonly number[], height: number }>} Plan
 */

/**
 * The last index whose value is at most a target, in values that never go down
 * @param {readonly number[]} values - The values
 * @param {number} target - The target
 * @returns {number} The index, or 0
 */
function lastAtMost(values, target) {
  let low = 0
  let high = values.length - 1
  while (low < high) {
    const middle = Math.ceil((low + high) / 2)
    if ((values[middle] ?? 0) <= target) {
      low = middle
    } else {
      high = middle - 1
    }
  }
  return Math.max(low, 0)
}

/**
 * The rank of a card, in the plan's terms
 * @param {Plan} at - The plan
 * @param {number} group - The group
 * @param {number} row - The row of cards in it
 * @param {number} column - The column
 * @returns {number} The rank, the row's last card if it is short
 */
function cardRank(at, group, row, column) {
  const size = at.sizes[group] ?? 0
  const first = row * at.columns
  return (at.starts[group] ?? 0) + 1 + Math.min(first + column, size - 1)
}

/**
 * Groups of cards under full-width headers
 * @param {GroupedCardsOptions} options - The width they fill, each group's card count, and the sizes in pixels
 * @returns {GroupedCards} The layout, its column count, and the card a number of rows up or down from another
 */
function groupedCards({ cardHeight, cardWidth, headerHeight, sizes, width }) {
  /** @type {{ width: number, sizes: readonly number[], plan: Plan } | undefined} */
  let cached = undefined

  /** @returns {Plan} The plan for the width and sizes now */
  const plan = () => {
    const now = { sizes: sizes.get(), width: width.get() }
    if (cached?.width === now.width && cached.sizes === now.sizes) {
      return cached.plan
    }
    const columns = Math.max(Math.floor(now.width / cardWidth), 1)
    /** @type {number[]} */
    const starts = []
    /** @type {number[]} */
    const tops = []
    /** @type {number[]} */
    const rows = []
    let rank = 0
    let top = 0
    for (const size of now.sizes) {
      starts.push(rank)
      tops.push(top)
      const count = Math.ceil(size / columns)
      rows.push(count)
      rank += size + 1
      top += headerHeight + count * cardHeight
    }
    const made = { columns, height: top, rows, sizes: now.sizes, starts, tops }
    cached = { ...now, plan: made }
    return made
  }

  /**
   * The rank at a pixel, rounded to the start of its header or row of cards, or past its end
   * @param {number} y - The pixel
   * @param {boolean} past - Whether to give the rank just past the row
   * @returns {number} The rank
   */
  const rankAt = (y, past) => {
    const { columns, sizes: counts, starts, tops } = plan()
    const group = lastAtMost(tops, y)
    const start = starts[group] ?? 0
    const local = y - (tops[group] ?? 0)
    if (local < headerHeight) {
      return past ? start + 1 : start
    }
    const row = Math.floor((local - headerHeight) / cardHeight)
    const end = start + 1 + (counts[group] ?? 0)
    return Math.min(start + 1 + (past ? row + 1 : row) * columns, end)
  }

  return {
    columns: { get: () => plan().columns, watch: (listener) => width.watch(listener) },
    extent: () => ({ height: plan().height }),
    place(rank) {
      const { columns, starts, tops } = plan()
      const group = lastAtMost(starts, rank)
      const local = rank - (starts[group] ?? 0)
      const top = tops[group] ?? 0
      if (local === 0) {
        return { height: headerHeight, x: 0, y: top }
      }
      const index = local - 1
      return {
        height: cardHeight,
        width: cardWidth,
        x: (index % columns) * cardWidth,
        y: top + headerHeight + Math.floor(index / columns) * cardHeight,
      }
    },
    ranksIn(start, end, count) {
      const clamp = (/** @type {number} */ rank) => Math.min(Math.max(rank, 0), count)
      return { from: clamp(rankAt(Math.max(start, 0), false)), to: clamp(rankAt(Math.max(end - 1, 0), true)) }
    },
    rowStep(rank, by) {
      const at = plan()
      const nonEmpty = at.rows.flatMap((rows, group) => (rows > 0 ? [group] : []))
      const firstGroup = nonEmpty[0]
      const lastGroup = nonEmpty.at(-1)
      if (firstGroup === undefined || lastGroup === undefined) {
        return undefined
      }
      if (rank === undefined) {
        return by < 0
          ? cardRank(at, lastGroup, (at.rows[lastGroup] ?? 1) - 1, at.columns - 1)
          : cardRank(at, firstGroup, 0, 0)
      }
      let group = lastAtMost(at.starts, rank)
      const local = rank - (at.starts[group] ?? 0)
      let column = local === 0 ? 0 : (local - 1) % at.columns
      let row = local === 0 ? (by > 0 ? -1 : 0) : Math.floor((local - 1) / at.columns)
      row += by
      while (row >= (at.rows[group] ?? 0) && group < lastGroup) {
        row -= at.rows[group] ?? 0
        group += 1
      }
      while (row < 0 && group > firstGroup) {
        group -= 1
        row += at.rows[group] ?? 0
      }
      while ((at.rows[group] ?? 0) === 0 && group < lastGroup) {
        group += 1
        row = 0
        column = 0
      }
      row = Math.min(Math.max(row, 0), (at.rows[group] ?? 1) - 1)
      return cardRank(at, group, row, column)
    },
    watch(listener) {
      const stops = [width.watch(listener), sizes.watch(listener)]
      return () => {
        for (const stop of stops) {
          stop()
        }
      }
    },
  }
}

export { groupedCards }
