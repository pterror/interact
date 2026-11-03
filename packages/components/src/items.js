/** @import { Change, Source } from '@interact/core/source' */

import { BlockCache, Listeners } from '@interact/core'

const NONE = 0

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

  /** @param {Source<T, F> | undefined} source - Where the items come from, dropping what was read from the last */
  set source(source) {
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
    return this.#source?.count() ?? NONE
  }

  /**
   * How many blocks the cache holds now: never more than its limit.
   * @returns {number} The blocks
   */
  get blocks() {
    return this.#cache?.blocks ?? NONE
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
