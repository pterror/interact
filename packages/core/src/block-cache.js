/** @import { Change, Source } from './source.js' */

import { Listeners } from './listeners.js'

const ONE_BLOCK = 1
const NOT_FOUND = -1

/**
 * A bounded cache of a source's items, read a block at a time and dropped least recently used first, so memory stays
 * level however many items the source has. Views read items and follow changes through it: it passes on each of the
 * source's changes after dropping what the change made stale, and reports blocks arriving as `changed` over their
 * positions.
 * @template T, F
 */
class BlockCache {
  /**
   * @readonly
   * @type {Source<T, F>}
   */
  #source
  /**
   * @readonly
   * @type {number}
   */
  #size
  /**
   * @readonly
   * @type {number}
   */
  #limit
  /**
   * Blocks by number, least recently used first.
   * @readonly
   * @type {Map<number, readonly T[]>}
   */
  #blocks = new Map()
  /**
   * Blocks being read, each with a token that a change replaces, so a read the change made stale is dropped.
   * @readonly
   * @type {Map<number, symbol>}
   */
  #pending = new Map()
  /**
   * @readonly
   * @type {Listeners<Change>}
   */
  #changes = new Listeners()
  /**
   * @readonly
   * @type {() => void}
   */
  #stop

  /**
   * @param {Source<T, F>} source - Where the items come from
   * @param {number} size - Items in a block
   * @param {number} limit - Blocks kept at most
   */
  constructor(source, size, limit) {
    if (!Number.isInteger(size) || size < ONE_BLOCK || !Number.isInteger(limit) || limit < ONE_BLOCK) {
      throw new RangeError('A block cache needs a whole number of items per block and of blocks, at least one each')
    }
    this.#source = source
    this.#size = size
    this.#limit = limit
    this.#stop = source.subscribe((change) => {
      this.#forget(change)
      this.#changes.emit(change)
    })
  }

  /**
   * How many blocks are here now, never more than the limit.
   * @returns {number} The count
   */
  get blocks() {
    return this.#blocks.size
  }

  /**
   * The item at a position, if its block is here.
   * @param {number} position - Where it is
   * @returns {T | undefined} The item, or undefined until its block arrives
   */
  get(position) {
    const block = Math.floor(position / this.#size)
    const items = this.#blocks.get(block)
    if (items !== undefined) {
      this.#keep(block, items)
    }
    return items?.at(position - block * this.#size)
  }

  /**
   * Reads the blocks holding the items from `start` up to `end` that aren't here or on their way. A block a source
   * gives at once is here before this returns.
   * @param {number} start - The first position
   * @param {number} end - The position after the last
   * @returns {Promise<void>} When every block read has arrived
   */
  async ensure(start, end) {
    const [first, last] = this.#blocksBetween(start, end)
    /** @type {Promise<void>[]} */
    const reads = []
    for (let block = first; block <= last; block += ONE_BLOCK) {
      const items = this.#blocks.get(block)
      if (items !== undefined) {
        this.#keep(block, items)
      } else if (!this.#pending.has(block)) {
        reads.push(this.#read(block))
      }
    }
    await Promise.all(reads)
  }

  /**
   * The first position at or after `from` among the items here whose item passes a test, without making any block
   * more recently used: at most the limit's blocks are looked at, whatever the source's size.
   * @param {(item: T) => boolean} test - The test
   * @param {number} from - Where to start
   * @returns {number | undefined} The position, if an item here passes
   */
  findHere(test, from) {
    const blocks = [...this.#blocks.keys()].filter((block) => (block + ONE_BLOCK) * this.#size > from)
    for (const block of blocks.toSorted((left, right) => left - right)) {
      const start = block * this.#size
      const index = this.#blocks.get(block)?.findIndex((item, at) => start + at >= from && test(item))
      if (index !== undefined && index !== NOT_FOUND) {
        return start + index
      }
    }
    return undefined
  }

  /**
   * Calls `listener` with each of the source's changes, once the cache has dropped what it made stale, and with each
   * block's positions as it arrives.
   * @param {(change: Change) => void} listener - Called with what changed
   * @returns {() => void} Stops calling it
   */
  subscribe(listener) {
    return this.#changes.add(listener)
  }

  /**
   * Stops following the source.
   * @returns {void}
   */
  dispose() {
    this.#stop()
  }

  /**
   * Reads a block, keeping it as soon as it arrives unless a change made it stale meanwhile.
   * @param {number} block - Its number
   * @returns {Promise<void>} When it has arrived
   */
  async #read(block) {
    const start = block * this.#size
    const result = this.#source.read(start, Math.min(start + this.#size, this.#source.count()))
    if (result instanceof Promise) {
      await this.#await(block, result)
    } else {
      this.#arrive(block, result)
    }
  }

  /**
   * Waits for a block being read, keeping it unless a change made it stale meanwhile.
   * @param {number} block - Its number
   * @param {Promise<readonly T[]>} result - Its items, on their way
   * @returns {Promise<void>} When it has arrived
   */
  async #await(block, result) {
    const token = Symbol(String(block))
    this.#pending.set(block, token)
    try {
      const items = await result
      if (this.#pending.get(block) === token) {
        this.#arrive(block, items)
      }
    } finally {
      if (this.#pending.get(block) === token) {
        this.#pending.delete(block)
      }
    }
  }

  /**
   * The numbers of the first and last blocks holding the items from `start` up to `end`.
   * @param {number} start - The first position
   * @param {number} end - The position after the last
   * @returns {[number, number]} The block numbers
   */
  #blocksBetween(start, end) {
    const first = Math.floor(start / this.#size)
    const last = Math.floor((Math.min(end, this.#source.count()) - ONE_BLOCK) / this.#size)
    if (last - first + ONE_BLOCK > this.#limit) {
      throw new RangeError(`Items from ${String(start)} up to ${String(end)} need more blocks than the cache keeps`)
    }
    return [first, last]
  }

  /**
   * Keeps an arrived block and says which positions it holds.
   * @param {number} block - Its number
   * @param {readonly T[]} items - Its items
   * @returns {void}
   */
  #arrive(block, items) {
    this.#keep(block, items)
    const start = block * this.#size
    this.#changes.emit({ end: start + items.length, kind: 'changed', start })
  }

  /**
   * Marks a block the most recently used, dropping the least recently used beyond the limit.
   * @param {number} block - Its number
   * @param {readonly T[]} items - Its items
   * @returns {void}
   */
  #keep(block, items) {
    this.#blocks.delete(block)
    this.#blocks.set(block, items)
    for (const oldest of this.#blocks.keys()) {
      if (this.#blocks.size <= this.#limit) {
        return
      }
      this.#blocks.delete(oldest)
    }
  }

  /**
   * Drops the blocks a change made stale, and the reads on their way for them.
   * @param {Change} change - What changed
   * @returns {void}
   */
  #forget(change) {
    const stale = this.#staleFrom(change)
    for (const map of [this.#blocks, this.#pending]) {
      for (const block of map.keys()) {
        if (stale(block)) {
          map.delete(block)
        }
      }
    }
  }

  /**
   * Which blocks a change makes stale: all of them after a reset, every one from the first position moved by an
   * insertion or removal, and those overlapping a changed range.
   * @param {Change} change - What changed
   * @returns {(block: number) => boolean} Whether a block is stale
   */
  #staleFrom(change) {
    if (change.kind === 'reset') {
      return () => true
    }
    const first = Math.floor(change.start / this.#size)
    if (change.kind !== 'changed') {
      return (block) => block >= first
    }
    const last = Math.floor((change.end - ONE_BLOCK) / this.#size)
    return (block) => block >= first && block <= last
  }
}

export { BlockCache }
