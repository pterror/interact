/**
 * Steps a number of rows up or down through a layout of cards: to the card in the same column of the row that many
 * away, or the last card of a shorter row. From none, 1 is the first card and -1 the last.
 */

/**
 * @template K
 * @typedef {Readonly<{
 *   locate: (key: K) => Promise<number | undefined>,
 *   keysAt: Readonly<{ keysAt: (from: number, to: number) => Promise<readonly K[]> }>,
 *   rowStep: (rank: number | undefined, rows: number) => number | undefined,
 * }>} GridStepOptions
 */

/**
 * @template K
 * @param {GridStepOptions<K>} options - A key's rank, the keys at ranks, and the layout's rank some rows away
 * @returns {(from: K | undefined, by: number) => Promise<K | undefined>} The Step, by rows
 */
function gridStep({ keysAt, locate, rowStep }) {
  return async (from, by) => {
    const rank = from === undefined ? undefined : await locate(from)
    const target = rowStep(rank, by)
    if (target === undefined) {
      return undefined
    }
    const [key] = await keysAt.keysAt(target, target + 1)
    return key
  }
}

export { gridStep }
