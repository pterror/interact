import { describe, expect, test } from 'bun:test'

import { arrayCount } from './array-count.js'
import { arrayKeysAt } from './array-keys-at.js'
import { arrayList } from './array-list.js'
import { arrayLocate } from './array-locate.js'
import { cell } from './cell.js'
import { computedKeysAt, computedLocate, computedStep } from './computed.js'
import { place } from './place.js'
import { posInSet } from './pos-in-set.js'
import { rows } from './rows.js'
import { sizer } from './sizer.js'
import { visibleRanks } from './visible-ranks.js'
import { windowing } from './windowing.js'

const BILLION = 1_000_000_000

/**
 * A key's rank in the billion-key list
 * @param {string} key - The key
 * @returns {number | undefined} Its rank
 */
function rankOf(key) {
  const rank = Number(key.slice(1))
  return key.startsWith('k') && Number.isInteger(rank) && rank >= 0 && rank < BILLION ? rank : undefined
}

const huge = { count: BILLION, keyAt: (/** @type {number} */ rank) => `k${String(rank)}`, rankOf }

/** @returns {Promise<void>} When pending answers have come */
async function settle() {
  await Bun.sleep(0)
}

/**
 * A value that never changes
 * @template T
 * @param {T} value - The value
 * @returns {Readonly<{ get: () => T, watch: () => () => void }>} It
 */
function fixed(value) {
  return { get: () => value, watch: () => () => undefined }
}

describe('rows', () => {
  test('gives the ranks in a span of pixels, where a rank goes, and how tall all are', () => {
    const layout = rows(20)
    expect(layout.ranksIn(30, 95, 100)).toEqual({ from: 1, to: 5 })
    expect(layout.ranksIn(30, 95, 3)).toEqual({ from: 1, to: 3 })
    expect(layout.place(3)).toEqual({ height: 20, x: 0, y: 60 })
    expect(layout.extent(7)).toEqual({ height: 140 })
  })
})

describe('visibleRanks', () => {
  test('follows the pixels in view', () => {
    const visible = cell({ end: 100, start: 0 })
    const ranks = visibleRanks({ count: fixed(BILLION), layout: rows(10), visible })
    let heard = 0
    ranks.watch(() => {
      heard += 1
    })
    expect(ranks.get()).toEqual({ from: 0, to: 10 })
    visible.set({ end: 1050, start: 1000 })
    expect(ranks.get()).toEqual({ from: 100, to: 105 })
    expect(heard).toBe(1)
  })
})

describe('windowing', () => {
  test('draws a billion-key list by the screen, a screen more each way, plus the kept keys wherever they are', async () => {
    const ranks = cell({ from: 500, to: 510 })
    /** @type {readonly string[]} */
    const last = ['k999999999']
    const keep = cell(last)
    const drawn = windowing({ keep, keysAt: computedKeysAt(huge), locate: computedLocate(rankOf), ranks })
    await settle()
    expect(drawn.keys()).toHaveLength(31)
    expect(drawn.keys()[0]).toBe('k490')
    expect(drawn.keys().at(-1)).toBe('k999999999')
    expect(drawn.rank('k999999999')).toBe(999_999_999)
    ranks.set({ from: 0, to: 10 })
    keep.set([])
    await settle()
    expect(drawn.keys()).toHaveLength(20)
    expect(drawn.rank('k0')).toBe(0)
  })

  test('uses only the answer to its latest question', async () => {
    /** @type {((keys: readonly string[]) => void)[]} */
    const answers = []
    const ranks = cell({ from: 0, to: 1 })
    const drawn = windowing({
      keep: fixed([]),
      keysAt: {
        keysAt: async () => {
          /** @type {PromiseWithResolvers<readonly string[]>} */
          const answer = Promise.withResolvers()
          answers.push(answer.resolve)
          return answer.promise
        },
        watch: () => () => undefined,
      },
      locate: () => Promise.resolve(undefined),
      ranks,
    })
    ranks.set({ from: 5, to: 6 })
    answers[1]?.(['new'])
    answers[0]?.(['old'])
    await settle()
    expect(drawn.keys()).toEqual(['new'])
  })

  test('asks again when the list changes', async () => {
    const list = arrayList(['a', 'b', 'c'])
    const drawn = windowing({
      keep: fixed([]),
      keysAt: arrayKeysAt(list),
      locate: arrayLocate(list.keys),
      ranks: fixed({ from: 0, to: 2 }),
    })
    await settle()
    expect(drawn.keys()).toEqual(['a', 'b', 'c'])
    list.set(['c', 'a'])
    await settle()
    expect(drawn.keys()).toEqual(['c', 'a'])
  })
})

describe('array and computed lists', () => {
  test('answer counts, ranks and steps', async () => {
    const list = arrayList(['a', 'b'])
    expect(arrayCount(list).get()).toBe(2)
    expect(await arrayLocate(list.keys)('b')).toBe(1)
    expect(await arrayLocate(list.keys)('z')).toBeUndefined()
    const step = computedStep(huge)
    expect(await step(undefined, -1)).toBe('k999999999')
    expect(await step('k5', 3)).toBe('k8')
    expect(await step('k1', -5)).toBe('k0')
  })
})

describe('place, sizer and posInSet', () => {
  const rank = { rank: (/** @type {string} */ key) => rankOf(key), watchRanks: () => () => undefined }

  test('place an element at its rank, size the container, and tell its position among all', () => {
    const element = document.createElement('div')
    place({ layout: rows(10), rank }).apply('k3', element)
    expect([element.style.position, element.style.top, element.style.height]).toEqual(['absolute', '30px', '10px'])
    const container = document.createElement('div')
    sizer({ count: fixed(1000), element: container, layout: rows(10) })
    expect(container.style.height).toBe('10000px')
    const facet = posInSet({ count: fixed(BILLION), position: rank })
    facet.apply('k3', element)
    expect([element.getAttribute('aria-posinset'), element.getAttribute('aria-setsize')]).toEqual(['4', '1000000000'])
    facet.apply('header', element)
    expect(element.hasAttribute('aria-posinset')).toBe(false)
  })
})
