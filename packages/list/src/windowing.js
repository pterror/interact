/**
 * The keys to draw for a list too long to draw whole: those in view, a screen more each way, and every key kept
 * (the active one), wherever it is. Answers may come late; only the answer to the latest question is used.
 */

/**
 * @template T
 * @typedef {Readonly<{ get: () => T, watch: (listener: () => void) => () => void }>} Watched
 */

/**
 * The keys from rank `from` up to `to`, and hearing the list change
 * @template K
 * @typedef {Readonly<{ keysAt: (from: number, to: number) => Promise<readonly K[]>,
 *   watch: (listener: () => void) => () => void }>} KeysAt
 */

/**
 * @template K
 * @typedef {Readonly<{
 *   ranks: Watched<Readonly<{ from: number, to: number }>>,
 *   keysAt: KeysAt<K>,
 *   keep: Watched<readonly K[]>,
 *   locate: (key: K) => Promise<number | undefined>,
 * }>} WindowingOptions
 */

/**
 * The keys drawn and each one's rank, and hearing either change
 * @template K
 * @typedef {Readonly<{
 *   keys: () => readonly K[],
 *   watch: (listener: () => void) => () => void,
 *   rank: (key: K) => number | undefined,
 *   watchRanks: (listener: () => void) => () => void,
 * }>} Windowed
 */

/**
 * @template K
 * @typedef {Readonly<{ keys: readonly K[], ranks: ReadonlyMap<K, number> }>} Drawing
 */

/**
 * Whether two drawings are the same
 * @template K
 * @param {Drawing<K>} one - A drawing
 * @param {Drawing<K>} other - Another
 * @returns {boolean} Whether they draw the same keys at the same ranks
 */
function same(one, other) {
  return (
    one.keys.length === other.keys.length &&
    one.keys.every((key, index) => other.keys[index] === key && other.ranks.get(key) === one.ranks.get(key))
  )
}

/**
 * Draws part of a long list
 * @template K
 * @param {WindowingOptions<K>} options - The ranks in view, the keys at ranks, the keys to keep drawn, and a key's rank
 * @returns {Windowed<K>} The keys to draw, and their ranks
 */
function windowing({ keep, keysAt, locate, ranks }) {
  /** @type {Readonly<{ from: number, keys: readonly K[] }>} */
  let window = { from: 0, keys: [] }
  /** @type {ReadonlyMap<K, number>} */
  let kept = new Map()
  /** @type {Drawing<K>} */
  let drawing = { keys: [], ranks: new Map() }
  let asked = 0
  let located = 0
  /** @type {Set<() => void>} */
  const drawnListeners = new Set()
  /** @type {Set<() => void>} */
  const rankListeners = new Set()

  const publish = () => {
    /** @type {Map<K, number>} */
    const all = new Map()
    for (const [index, key] of window.keys.entries()) {
      all.set(key, window.from + index)
    }
    for (const [key, rank] of kept) {
      all.set(key, rank)
    }
    const keys = [...all.keys()].toSorted((one, other) => (all.get(one) ?? 0) - (all.get(other) ?? 0))
    const next = { keys, ranks: all }
    if (same(drawing, next)) {
      return
    }
    drawing = next
    for (const listener of drawnListeners) {
      listener()
    }
    for (const listener of rankListeners) {
      listener()
    }
  }

  const ask = async () => {
    asked += 1
    const question = asked
    const { from, to } = ranks.get()
    const screen = to - from
    const start = Math.max(from - screen, 0)
    const keys = await keysAt.keysAt(start, to + screen)
    if (question === asked) {
      window = { from: start, keys }
      publish()
    }
  }

  const locateKept = async () => {
    located += 1
    const question = located
    const keys = keep.get()
    const found = await Promise.all(keys.map(async (key) => locate(key)))
    if (question === located) {
      /** @type {Map<K, number>} */
      const next = new Map()
      for (const [index, key] of keys.entries()) {
        const rank = found[index]
        if (rank !== undefined) {
          next.set(key, rank)
        }
      }
      kept = next
      publish()
    }
  }

  void ask()
  void locateKept()
  ranks.watch(() => {
    void ask()
  })
  keep.watch(() => {
    void locateKept()
  })
  keysAt.watch(() => {
    void ask()
    void locateKept()
  })

  return {
    keys: () => drawing.keys,
    rank: (key) => drawing.ranks.get(key),
    watch(listener) {
      drawnListeners.add(listener)
      return () => {
        drawnListeners.delete(listener)
      }
    },
    watchRanks(listener) {
      rankListeners.add(listener)
      return () => {
        rankListeners.delete(listener)
      }
    },
  }
}

export { windowing }
