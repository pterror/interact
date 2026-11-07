/**
 * @import { Selection } from '@interact/core/selection'
 * @import { Change, Source } from '@interact/core/source'
 */

import { BlockCache, Listeners, findsSelected, firstSelected, startsWithTyped } from '@interact/core'

/**
 * A collection component's items: a source, read a block at a time through a bounded cache, so any number of items
 * costs the same. Views and behaviors read items here and hear the source's changes here, with blocks arriving
 * reported as changes too; failed reads are reported, not thrown.
 * @template T, F
 */
class Items {
  /**
   * @readonly
   * @type {number}
   */
  #blockSize
  /**
   * @readonly
   * @type {number}
   */
  #blocks
  /** @type {Source<T, F> | undefined} */
  #source = undefined
  /** @type {BlockCache<T, F> | undefined} */
  #cache = undefined
  /** @type {(() => void) | undefined} */
  #unfollow = undefined
  /**
   * @readonly
   * @type {Listeners<Change>}
   */
  #changes = new Listeners()
  /**
   * @readonly
   * @type {Listeners<unknown>}
   */
  #errors = new Listeners()

  /**
   * @param {number} blockSize - Items read at a time
   * @param {number} blocks - Blocks kept at most
   */
  constructor(blockSize, blocks) {
    this.#blockSize = blockSize
    this.#blocks = blocks
  }

  /**
   * Where the items come from.
   * @returns {Source<T, F> | undefined} The source
   */
  get source() {
    return this.#source
  }

  /**
   * Takes items from a source, dropping what was read from the last.
   * @param {Source<T, F> | undefined} source - Where the items come from
   * @returns {void}
   */
  use(source) {
    this.#unfollow?.()
    this.#cache?.dispose()
    this.#source = source
    const cache = source ? new BlockCache(source, this.#blockSize, this.#blocks) : undefined
    this.#cache = cache
    this.#unfollow = cache?.subscribe((change) => {
      this.#changes.emit(change)
    })
  }

  /**
   * How many items there are.
   * @returns {number} The count
   */
  get count() {
    return this.#source?.count() ?? 0
  }

  /**
   * How many blocks the cache holds now: never more than its limit.
   * @returns {number} The blocks
   */
  get blocks() {
    return this.#cache?.blocks ?? 0
  }

  /**
   * The item at a position, once it has been read.
   * @param {number} position - Where it is
   * @returns {T | undefined} The item, or undefined until it arrives
   */
  item(position) {
    return this.#cache?.get(position)
  }

  /**
   * Starts reading the items from `start` up to `end` that aren't here yet; each block is reported as it arrives, and
   * a failed read as an error.
   * @param {number} start - The first position
   * @param {number} end - The position after the last
   * @returns {void}
   */
  read(start, end) {
    if (this.#cache && end > start) {
      void this.#read(this.#cache, start, end)
    }
  }

  /**
   * The first position at or after `from` whose item's text starts with `text`, going round to the start if there is
   * none after it: asked of the source when it can search (`findPrefix`), else looked for among the items read so
   * far. A failed search is reported as an error, and finds nothing.
   * @param {string} text - What was typed
   * @param {number} from - Where to start
   * @param {(item: T) => string} textOf - An item's text, for looking among the items read
   * @returns {Promise<number | undefined>} The position, if an item's text starts so
   */
  async findPrefix(text, from, textOf) {
    const { count } = this
    const start = from < count ? Math.max(from, 0) : 0
    try {
      const found = await this.#find(text, start, textOf)
      return found === undefined && start > 0 ? await this.#find(text, 0, textOf) : found
    } catch (error) {
      this.#errors.emit(error)
      return undefined
    }
  }

  /**
   * Whether the source can say where a selection starts (see `findsSelected`).
   * @param {Selection<F>} selection - The selection
   * @returns {boolean} Whether `firstSelected` can ask it
   */
  findsSelected(selection) {
    return this.#source !== undefined && findsSelected(selection, this.#source)
  }

  /**
   * Where a selection starts, asked of the source. A failed answer is reported as an error, and finds nothing.
   * @param {Selection<F>} selection - The selection, for a source that `findsSelected`
   * @returns {Promise<number | undefined>} The first selected position, if any
   */
  async firstSelected(selection) {
    const source = this.#source
    if (source === undefined) {
      return undefined
    }
    try {
      const found = await firstSelected(selection, source)
      return found
    } catch (error) {
      this.#errors.emit(error)
      return undefined
    }
  }

  /**
   * Calls `listener` with each change in the source, and with each block's positions as it arrives.
   * @param {(change: Change) => void} listener - What to call
   * @returns {() => void} Stops calling it
   */
  subscribe(listener) {
    return this.#changes.add(listener)
  }

  /**
   * Calls `listener` with each failed read.
   * @param {(problem: unknown) => void} listener - What to call
   * @returns {() => void} Stops calling it
   */
  onError(listener) {
    return this.#errors.add(listener)
  }

  /**
   * The first position at or after `from` whose item's text starts with `text`, with no going round.
   * @param {string} text - What was typed
   * @param {number} from - Where to start
   * @param {(item: T) => string} textOf - An item's text
   * @returns {Promise<number | undefined>} The position, if any
   */
  async #find(text, from, textOf) {
    const source = this.#source
    if (source?.findPrefix) {
      const found = await source.findPrefix(text, from)
      return found
    }
    return this.#cache?.findHere((item) => startsWithTyped(textOf(item), text), from)
  }

  /**
   * Reads a range through the cache, reporting a failure.
   * @param {BlockCache<T, F>} cache - The cache
   * @param {number} start - The first position
   * @param {number} end - The position after the last
   * @returns {Promise<void>} When it has arrived or failed
   */
  async #read(cache, start, end) {
    try {
      await cache.ensure(start, end)
    } catch (error) {
      this.#errors.emit(error)
    }
  }
}

export { Items }
