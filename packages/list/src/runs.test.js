import { describe, expect, test } from 'bun:test'

import { cell } from './cell.js'
import { runs } from './runs.js'

describe('runs', () => {
  test('a key continues a run when its neighbour is known and the two belong together', () => {
    /** @type {Map<string, { key: string | undefined }>} */
    const known = new Map([
      ['a', { key: undefined }],
      ['b', { key: 'a' }],
      ['c', { key: 'b' }],
    ])
    const authors = cell(
      new Map([
        ['a', 'ann'],
        ['b', 'ann'],
        ['c', 'bo'],
        ['d', 'bo'],
      ]),
    )
    const continues = runs({
      before: { of: (/** @type {string} */ key) => known.get(key), watch: () => () => undefined },
      together: {
        has: (/** @type {string} */ before, /** @type {string} */ key) =>
          authors.get().get(before) === authors.get().get(key),
        watch: (listener) =>
          authors.watch(() => {
            listener()
          }),
      },
    })
    expect(['a', 'b', 'c', 'd'].map((key) => continues.has(key))).toEqual([false, true, false, false])
  })

  test('is heard for the keys whose neighbour changed, and for any key when an item changes', () => {
    /** @type {Set<(keys?: readonly string[]) => void>} */
    const neighbours = new Set()
    const items = cell(0)
    const continues = runs({
      before: {
        of: () => undefined,
        watch(listener) {
          neighbours.add(listener)
          return () => {
            neighbours.delete(listener)
          }
        },
      },
      together: {
        has: () => true,
        watch: (listener) =>
          items.watch(() => {
            listener(['b'])
          }),
      },
    })
    /** @type {(readonly string[] | undefined)[]} */
    const heard = []
    const stop = continues.watch((keys) => {
      heard.push(keys)
    })
    for (const listener of neighbours) {
      listener(['c'])
    }
    items.set(1)
    stop()
    items.set(2)
    expect(heard).toEqual([['c'], undefined])
    expect(neighbours.size).toBe(0)
  })
})
