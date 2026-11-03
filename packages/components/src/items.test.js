import { describe, expect, test } from 'bun:test'

import { Items } from './items.js'
import { TEN_BILLION, numbers } from './test-helpers.js'

const BLOCK = 100
const LIMIT = 4
const FAR = 7_000_000_000
const START = 0
const ONE = 1
const JUMPS = 50

describe('Items', () => {
  test('reads a range through the cache, the items there before read returns', () => {
    const items = new Items(BLOCK, LIMIT)
    items.source = numbers(TEN_BILLION).source
    items.read(FAR, FAR + ONE)
    expect([items.count, items.item(FAR)]).toEqual([TEN_BILLION, { id: FAR }])
  })

  test('holds no more blocks than its limit', () => {
    const items = new Items(BLOCK, LIMIT)
    items.source = numbers(TEN_BILLION).source
    for (let jump = START; jump < JUMPS; jump += ONE) {
      items.read(jump * BLOCK * BLOCK, jump * BLOCK * BLOCK + ONE)
    }
    expect(items.blocks).toBe(LIMIT)
  })

  test('reports a failed read instead of throwing', async () => {
    const items = new Items(BLOCK, LIMIT)
    const { source } = numbers(TEN_BILLION)
    items.source = {
      ...source,
      read: async () => {
        await Promise.resolve()
        throw new Error('offline')
      },
    }
    /** @type {unknown[]} */
    const problems = []
    items.onError((problem) => {
      problems.push(problem)
    })
    items.read(START, ONE)
    await Bun.sleep(ONE)
    expect(problems).toHaveLength(ONE)
  })

  test('is empty without a source', () => {
    const items = new Items(BLOCK, LIMIT)
    items.read(START, ONE)
    expect([items.count, items.blocks, items.item(START)]).toEqual([START, START, undefined])
  })
})

describe('Items searching', () => {
  test('reports a failed search, which finds nothing', async () => {
    const items = new Items(BLOCK, LIMIT)
    items.source = {
      ...numbers(TEN_BILLION).source,
      findPrefix: async () => {
        await Promise.resolve()
        throw new Error('offline')
      },
    }
    /** @type {unknown[]} */
    const problems = []
    items.onError((problem) => {
      problems.push(problem)
    })
    expect(await items.findPrefix('x', FAR, () => '')).toBeUndefined()
    expect(problems).toHaveLength(ONE)
  })
})
