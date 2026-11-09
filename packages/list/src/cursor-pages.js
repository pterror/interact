/**
 * A list read a page at a time after a cursor, with no ranks or total of its own: ranks count the pages read so far.
 * It holds one run of consecutive pages and keeps every page's cursor and size, so a dropped page is read again by its
 * cursor. Only the answer to the latest question is used.
 */

/**
 * @template T
 * @typedef {Readonly<{ get: () => T, watch: (listener: () => void) => () => void }>} Watched
 */

/**
 * A page: the cursor it was read at (none: the first), its keys, and the cursor of the page after it (none: the last)
 * @template K, C
 * @typedef {Readonly<{ cursor: C | undefined, keys: readonly K[], next: C | undefined }>} Page
 */

/**
 * The pages from the one at cursor `from` (none: the first), each the page after the one before: at most `count`,
 * fewer when the list ends or the source reads fewer at once; and hearing the list change
 * @template K, C
 * @typedef {Readonly<{
 *   read: (from: C | undefined, count: number) => Promise<readonly Page<K, C>[]>,
 *   watch: (listener: () => void) => () => void,
 * }>} Pages
 */

/**
 * The keys at ranks, a held key's rank, steps through the held keys, how many keys are known, whether the list's end
 * has been read, and hearing the held keys change
 * @template K
 * @typedef {Readonly<{
 *   keysAt: (from: number, to: number) => Promise<readonly K[]>,
 *   watch: (listener: () => void) => () => void,
 *   locate: (key: K) => Promise<number | undefined>,
 *   step: (key: K | undefined, by: number) => Promise<K | undefined>,
 *   count: Watched<number>,
 *   ended: Watched<boolean>,
 * }>} CursorPages
 */

/**
 * @template C
 * @typedef {Readonly<{ cursor: C | undefined, size: number, next: C | undefined }>} Known
 */

/**
 * @typedef {Readonly<{ start: number, count: number }>} Run
 */

/**
 * @template K
 * @typedef {Readonly<{ from: number, to: number, answer: (keys: readonly K[]) => void }>} Question
 */

/**
 * Tells each listener
 * @param {ReadonlySet<() => void>} heard - The listeners
 * @returns {void}
 */
function tell(heard) {
  for (const listener of heard) {
    listener()
  }
}

/**
 * A Watched over listeners kept elsewhere
 * @template T
 * @param {() => T} get - The value now
 * @param {Set<() => void>} heard - Where its listeners go
 * @returns {Watched<T>} It
 */
function watchedBy(get, heard) {
  return {
    get,
    watch(listener) {
      heard.add(listener)
      return () => {
        heard.delete(listener)
      }
    },
  }
}

/**
 * Reads a list by its pages' cursors
 * @template K, C
 * @param {Pages<K, C>} pages - The source of pages
 * @returns {CursorPages<K>} The list as ranks
 */
function cursorPages(pages) {
  /** @type {Known<C>[]} */
  const known = []
  let ended = false
  /** @type {{ start: number, keys: (readonly K[])[] }} */
  let held = { keys: [], start: 0 }
  let reading = false
  let changed = true
  /** @type {Question<K> | undefined} */
  let wanted = undefined
  /** @type {Question<K> | undefined} */
  let stalled = undefined
  /** @type {Set<() => void>} */
  const listeners = new Set()
  /** @type {Set<() => void>} */
  const countListeners = new Set()

  const total = () => known.reduce((sum, page) => sum + page.size, 0)
  const offsetOf = (/** @type {number} */ index) => known.slice(0, index).reduce((sum, page) => sum + page.size, 0)
  const perPage = () => Math.max(1, ...known.map((page) => page.size))
  const cursorAt = (/** @type {number} */ index) => (index < known.length ? known[index]?.cursor : known.at(-1)?.next)
  const heldKeys = () => held.keys.flat()
  const keysIn = (/** @type {number} */ from, /** @type {number} */ to) => {
    const offset = offsetOf(held.start)
    return heldKeys().filter((_, index) => offset + index >= from && offset + index < to)
  }

  /**
   * The run of pages ranks `from` up to `to` lie on
   * @param {number} from - The first rank
   * @param {number} to - The rank after the last
   * @returns {Run & { beyond: boolean } | undefined} The run, and whether it reads pages not known yet
   */
  const needed = (from, to) => {
    let offset = 0
    let first = known.length
    let last = -1
    for (const [index, page] of known.entries()) {
      if (first === known.length && offset + page.size > from) {
        first = index
      }
      if (offset < to) {
        last = index
      }
      offset += page.size
    }
    if (to > offset && !ended) {
      const more = Math.ceil((to - offset) / perPage())
      return { beyond: true, count: known.length - first + Math.max(more, 1), start: first }
    }
    return last >= first ? { beyond: false, count: last - first + 1, start: first } : undefined
  }

  const covered = (/** @type {Readonly<Run & { beyond: boolean }>} */ run) =>
    !run.beyond && held.start <= run.start && run.start + run.count <= held.start + held.keys.length

  /**
   * Takes in the pages read from a run's start
   * @param {number} start - The run's first page
   * @param {readonly Page<K, C>[]} answer - The pages read
   * @returns {void}
   */
  const take = (start, answer) => {
    const countBefore = total()
    const endedBefore = ended
    const keysBefore = heldKeys()
    const offsetBefore = offsetOf(held.start)
    for (const [index, page] of answer.entries()) {
      known[start + index] = { cursor: page.cursor, next: page.next, size: page.keys.length }
    }
    const last = answer.at(-1)
    const end = start + answer.length
    if (last?.next === undefined) {
      known.length = Math.min(known.length, end)
      ended = true
    } else {
      if (known.length > end && known[end]?.cursor !== last.next) {
        known.length = end
      }
      ended = false
    }
    held = { keys: answer.map((page) => page.keys), start }
    const keysNow = heldKeys()
    if (total() !== countBefore || ended !== endedBefore) {
      tell(countListeners)
    }
    if (
      offsetOf(start) !== offsetBefore ||
      keysNow.length !== keysBefore.length ||
      keysNow.some((key, index) => keysBefore[index] !== key)
    ) {
      tell(listeners)
    }
  }

  /**
   * Reads a run and takes it in, then goes on with what is wanted; a read that fails leaves what is held
   * @param {Readonly<Run & { beyond: boolean }>} run - The run
   * @param {Question<K> | undefined} asker - The question it reads for, if any
   * @returns {Promise<void>} When it is taken in
   */
  async function read(run, asker) {
    reading = true
    const knownBefore = known.length
    const answer = await pages.read(cursorAt(run.start), run.count).catch(() => undefined)
    reading = false
    if (answer !== undefined) {
      take(run.start, answer)
    }
    if (asker !== undefined && (answer === undefined || (run.beyond && known.length <= knownBefore && !ended))) {
      stalled = asker
    }
    pump()
  }

  /**
   * Starts the read that what is wanted needs, or answers the question waiting
   * @returns {void}
   */
  function pump() {
    if (reading) {
      return
    }
    if (changed) {
      changed = false
      const count = Math.max(held.keys.length, 1)
      void read({ beyond: false, count, start: held.keys.length > 0 ? held.start : 0 }, undefined)
      return
    }
    const question = wanted
    if (question === undefined) {
      return
    }
    const run = needed(question.from, question.to)
    if (run === undefined || covered(run) || stalled === question) {
      wanted = undefined
      stalled = undefined
      question.answer(keysIn(question.from, question.to))
      return
    }
    void read(run, question)
  }

  pages.watch(() => {
    changed = true
    pump()
  })
  pump()

  return {
    count: watchedBy(total, countListeners),
    ended: watchedBy(() => ended, countListeners),
    keysAt(from, to) {
      wanted?.answer([])
      const { promise, resolve } = Promise.withResolvers()
      wanted = { answer: resolve, from, to }
      pump()
      return promise
    },
    locate(key) {
      const at = heldKeys().indexOf(key)
      return Promise.resolve(at === -1 ? undefined : offsetOf(held.start) + at)
    },
    step(key, by) {
      const keys = heldKeys()
      if (keys.length === 0) {
        return Promise.resolve(undefined)
      }
      if (key === undefined) {
        return Promise.resolve(by > 0 ? keys[Math.min(by, keys.length) - 1] : keys[Math.max(keys.length + by, 0)])
      }
      const at = keys.indexOf(key)
      return Promise.resolve(at === -1 ? key : keys[Math.min(Math.max(at + by, 0), keys.length - 1)])
    },
    watch(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

export { cursorPages }
