/** @import { Change, Source } from './source.js' */

import { describe, expect, test } from 'bun:test'

import { BlockCache } from './block-cache.js'
import { Listeners } from './listeners.js'
import { MemorySource } from './memory-source.js'

/** @typedef {Readonly<{ id: number }>} Item */
/** @typedef {Readonly<{ start: number, end: number }>} Range */
/**
 * @typedef {Readonly<{
 *   source: Source<Item, Range>,
 *   reads: readonly number[],
 *   release: () => void,
 *   emit: (change: Change) => void,
 * }>} Numbers
 */

const TEN_BILLION = 10_000_000_000
const SIZE = 100
const HALF = 50
const LIMIT = 10
const FAR = 8_000_000_000
const START = 0
const ONE = 1

/**
 * Ten billion numbered items, made as they are read. Each read is recorded and answers when `release` is called.
 * @returns {Numbers} The source, the starts of its reads, and ways to answer the reads waiting and to report a change
 */
function numbers() {
  /** @type {number[]} */
  const reads = []
  /** @type {(() => void)[]} */
  const waiting = []
  /** @type {Listeners<Change>} */
  const changes = new Listeners()
  /** @type {Source<Item, Range>} */
  const source = {
    count: () => TEN_BILLION,
    countMatching: (range) => range.end - range.start,
    key: (item) => item.id,
    matches: (range, item) => item.id >= range.start && item.id < range.end,
    read: async (start, end) => {
      reads.push(start)
      /** @type {PromiseWithResolvers<void>} */
      const gate = Promise.withResolvers()
      waiting.push(gate.resolve)
      await gate.promise
      return Array.from({ length: end - start }, (_skip, offset) => ({ id: start + offset }))
    },
    span: (start, end) => ({ end, start }),
    subscribe: (listener) => changes.add(listener),
  }
  return {
    emit: (change) => {
      changes.emit(change)
    },
    reads,
    release: () => {
      for (const answer of waiting.splice(START)) {
        answer()
      }
    },
    source,
  }
}

/**
 * Ensures a range, answering the reads it starts.
 * @param {BlockCache<Item, Range>} cache - The cache
 * @param {Numbers} numbered - Its source
 * @param {readonly [number, number]} range - The first position, and the one after the last
 * @returns {Promise<void>} When the range is in the cache
 */
async function ensured(cache, numbered, [start, end]) {
  const done = cache.ensure(start, end)
  numbered.release()
  await done
}

/**
 * What a promise rejects with.
 * @param {Promise<unknown>} promise - The promise
 * @returns {Promise<unknown>} The reason, or undefined when it fulfills
 */
async function rejection(promise) {
  try {
    await promise
  } catch (error) {
    return error
  }
  return undefined
}

/**
 * Every change a cache passes on.
 * @param {BlockCache<Item, Range>} cache - The cache
 * @returns {Change[]} The changes, as they come
 */
function heardFrom(cache) {
  /** @type {Change[]} */
  const heard = []
  cache.subscribe((change) => {
    heard.push(change)
  })
  return heard
}

describe('reading', () => {
  test('reads only the blocks a range needs, ten billion items in', async () => {
    const numbered = numbers()
    const cache = new BlockCache(numbered.source, SIZE, LIMIT)
    await ensured(cache, numbered, [FAR + HALF, FAR + SIZE + SIZE])
    expect(numbered.reads).toEqual([FAR, FAR + SIZE])
    expect(cache.get(FAR + SIZE + ONE)).toEqual({ id: FAR + SIZE + ONE })
  })

  test('has a block a source gives at once before ensure returns', async () => {
    const source = new MemorySource(['a', 'b', 'c'], (item) => item)
    const cache = new BlockCache(source, SIZE, LIMIT)
    const done = cache.ensure(START, source.count())
    expect(cache.get(ONE)).toBe('b')
    await done
  })

  test('refuses a range needing more blocks than it keeps', async () => {
    const cache = new BlockCache(numbers().source, SIZE, LIMIT)
    expect(await rejection(cache.ensure(START, SIZE * (LIMIT + ONE)))).toBeInstanceOf(RangeError)
  })
})

describe('keeping', () => {
  test('keeps at most its limit of blocks, dropping the least recently used', async () => {
    const numbered = numbers()
    const cache = new BlockCache(numbered.source, SIZE, LIMIT)
    await ensured(cache, numbered, [START, SIZE * LIMIT])
    await ensured(cache, numbered, [SIZE * LIMIT, SIZE * (LIMIT + ONE)])
    expect(cache.get(START)).toBeUndefined()
    expect(cache.get(SIZE)).toEqual({ id: SIZE })
    expect(cache.get(SIZE * LIMIT)).toEqual({ id: SIZE * LIMIT })
  })
})

describe('following changes', () => {
  test('drops what a change made stale, a read still on its way too, and then passes the change on', async () => {
    const numbered = numbers()
    const cache = new BlockCache(numbered.source, SIZE, LIMIT)
    const heard = heardFrom(cache)
    const done = cache.ensure(START, SIZE)
    numbered.emit({ end: ONE, kind: 'inserted', start: START })
    numbered.release()
    await done
    expect(cache.get(START)).toBeUndefined()
    expect(heard).toEqual([{ end: ONE, kind: 'inserted', start: START }])
  })

  test('reports a block arriving as changed over its positions', async () => {
    const numbered = numbers()
    const cache = new BlockCache(numbered.source, SIZE, LIMIT)
    const heard = heardFrom(cache)
    await ensured(cache, numbered, [SIZE, SIZE + ONE])
    expect(heard).toEqual([{ end: SIZE + SIZE, kind: 'changed', start: SIZE }])
  })
})
