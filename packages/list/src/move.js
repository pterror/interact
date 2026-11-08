/**
 * Moving a key through a list, by steps the list answers, now or later. Moves made while one is under way queue, each
 * from the one before's result; a change to the key from anywhere else drops what is queued.
 */

/**
 * What a move needs: the key now, the key `n` on from another (none: from an edge), and setting the key
 * @template K
 * @typedef {Readonly<{
 *   from: () => K | undefined,
 *   step: (from: K | undefined, by: number) => Promise<K | undefined>,
 *   to: (key: K | undefined) => void,
 * }>} MoveOptions
 */

/**
 * Moves: `by(n)` moves the key `n` on (back, if negative), `edge(n)` moves it to the key `n` from an edge (1: the
 * first, -1: the last). Each resolves when its move is made or dropped, and rejects if its step fails
 * @typedef {Readonly<{ by: (n: number) => Promise<void>, edge: (n: number) => Promise<void> }>} Move
 */

/**
 * Moving a key
 * @template K
 * @param {MoveOptions<K>} options - The key now, the steps, and setting the key
 * @returns {Move} The moves
 */
function move({ from, step, to }) {
  /** @type {Promise<Readonly<{ key: K | undefined }> | undefined> | undefined} */
  let tail = undefined

  /**
   * Queues a move
   * @param {(key: K | undefined) => K | undefined} start - Where it steps from, given the key it starts at
   * @param {number} n - How far
   * @returns {Promise<void>} When it is made or dropped
   */
  const queue = async (start, n) => {
    const previous = tail ?? Promise.resolve({ key: from() })
    const link = previous.then(
      async (made) => {
        if (made === undefined || from() !== made.key) {
          return undefined
        }
        const found = await step(start(made.key), n)
        if (from() !== made.key) {
          return undefined
        }
        to(found)
        return { key: found }
      },
      () => undefined,
    )
    tail = link
    try {
      await link
    } finally {
      if (tail === link) {
        tail = undefined
      }
    }
  }

  return {
    by: async (n) => queue((key) => key, n),
    edge: async (n) => queue(() => undefined, n),
  }
}

export { move }
