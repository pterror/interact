import { describe, expect, test } from 'bun:test'

import { cursorPages } from './cursor-pages.js'

/** @returns {Promise<void>} When pending answers have come */
async function settle() {
  await Bun.sleep(0)
}

/**
 * A list of keys served in pages of `size`, each page's cursor the key before it, read in one question per run
 * @param {readonly string[]} keys - The list
 * @param {number} size - Keys per page
 * @returns {{
 *   source: import('./cursor-pages.js').Pages<string, string>,
 *   asked: { from: string | undefined, count: number }[],
 *   set: (next: readonly string[]) => void,
 *   hold: () => () => void,
 * }} The source, what it was asked, a change to the list, and holding answers back until let go
 */
function server(keys, size) {
  let list = keys
  /** @type {{ from: string | undefined, count: number }[]} */
  const asked = []
  /** @type {Set<() => void>} */
  const listeners = new Set()
  /** @type {Promise<void> | undefined} */
  let gate = undefined
  const page = (/** @type {string | undefined} */ cursor) => {
    const start = cursor === undefined ? 0 : list.indexOf(cursor) + 1
    const pageKeys = list.slice(start, start + size)
    const next = start + size < list.length ? pageKeys.at(-1) : undefined
    return { cursor, keys: pageKeys, next }
  }
  return {
    asked,
    hold() {
      const { promise, resolve } = Promise.withResolvers()
      gate = promise.then(() => undefined)
      return () => {
        gate = undefined
        resolve(undefined)
      }
    },
    set(next) {
      list = next
      for (const listener of listeners) {
        listener()
      }
    },
    source: {
      async read(from, count) {
        asked.push({ count, from })
        const waited = gate
        if (waited !== undefined) {
          await waited
        }
        const read = []
        /** @type {string | undefined} */
        let cursor = from
        for (let index = 0; index < count; index += 1) {
          const next = page(cursor)
          read.push(next)
          if (next.next === undefined) {
            break
          }
          cursor = next.next
        }
        return read
      },
      watch(listener) {
        listeners.add(listener)
        return () => {
          listeners.delete(listener)
        }
      },
    },
  }
}

const KEYS = Array.from({ length: 10 }, (_, index) => `k${String(index)}`)

describe('cursorPages', () => {
  test('reads the first page, then pages in order as later ranks are asked for, the count growing to the end', async () => {
    const served = server(KEYS, 3)
    const list = cursorPages(served.source)
    await settle()
    expect([list.count.get(), list.ended.get()]).toEqual([3, false])
    expect(await list.keysAt(0, 5)).toEqual(['k0', 'k1', 'k2', 'k3', 'k4'])
    expect(list.count.get()).toBe(6)
    expect(await list.keysAt(4, 20)).toEqual(['k4', 'k5', 'k6', 'k7', 'k8', 'k9'])
    expect([list.count.get(), list.ended.get()]).toEqual([10, true])
    expect(served.asked).toEqual([
      { count: 1, from: undefined },
      { count: 2, from: undefined },
      { count: 6, from: 'k2' },
    ])
    expect(await list.locate('k7')).toBe(7)
    expect(await list.locate('k0')).toBeUndefined()
  })

  test('answers from the pages held without asking, and reads a dropped page again by its cursor', async () => {
    const served = server(KEYS, 3)
    const list = cursorPages(served.source)
    expect(await list.keysAt(0, 2)).toEqual(['k0', 'k1'])
    expect(served.asked).toHaveLength(1)
    expect(await list.keysAt(3, 6)).toEqual(['k3', 'k4', 'k5'])
    expect(served.asked.at(-1)).toEqual({ count: 1, from: 'k2' })
    expect(await list.keysAt(6, 9)).toEqual(['k6', 'k7', 'k8'])
    expect(await list.locate('k3')).toBeUndefined()
    expect(await list.keysAt(4, 5)).toEqual(['k4'])
    expect(served.asked.at(-1)).toEqual({ count: 1, from: 'k2' })
    expect(await list.locate('k4')).toBe(4)
    expect(await list.keysAt(0, 1)).toEqual(['k0'])
    expect(served.asked.at(-1)).toEqual({ count: 1, from: undefined })
    expect(served.asked).toHaveLength(5)
  })

  test('uses only the answer to the latest question', async () => {
    const served = server(KEYS, 3)
    const list = cursorPages(served.source)
    await settle()
    const release = served.hold()
    const early = list.keysAt(0, 9)
    await settle()
    const late = list.keysAt(0, 2)
    release()
    expect(await early).toEqual([])
    expect(await late).toEqual(['k0', 'k1'])
  })

  test('reads the held run again when the source changes, forgetting the pages after a link that moved', async () => {
    const served = server(KEYS, 3)
    const list = cursorPages(served.source)
    await list.keysAt(3, 6)
    await list.keysAt(6, 9)
    expect(await list.keysAt(0, 3)).toEqual(['k0', 'k1', 'k2'])
    expect(list.count.get()).toBe(9)
    let heard = 0
    list.watch(() => {
      heard += 1
    })
    served.set(['k0', 'new', ...KEYS.slice(1)])
    await settle()
    expect([heard, served.asked.at(-1)]).toEqual([1, { count: 1, from: undefined }])
    expect([list.count.get(), list.ended.get()]).toEqual([3, false])
    expect(await list.keysAt(0, 6)).toEqual(['k0', 'new', 'k1', 'k2', 'k3', 'k4'])
    expect(await list.keysAt(0, 20)).toHaveLength(11)
    expect(list.ended.get()).toBe(true)
  })

  test('a read that fails answers the question with what is held, and is not asked again', async () => {
    const served = server(KEYS, 3)
    let failing = false
    const list = cursorPages({
      async read(/** @type {string | undefined} */ from, /** @type {number} */ count) {
        if (failing) {
          throw new Error('gone')
        }
        return served.source.read(from, count)
      },
      watch: served.source.watch,
    })
    expect(await list.keysAt(0, 3)).toEqual(['k0', 'k1', 'k2'])
    failing = true
    const asked = served.asked.length
    expect(await list.keysAt(0, 9)).toEqual(['k0', 'k1', 'k2'])
    expect(served.asked).toHaveLength(asked)
  })

  test('steps through the held keys and stops at their ends; an empty list is ended with none', async () => {
    const list = cursorPages(server(KEYS, 3).source)
    await list.keysAt(0, 6)
    expect(await list.step(undefined, 1)).toBe('k0')
    expect(await list.step(undefined, -1)).toBe('k5')
    expect(await list.step('k1', 2)).toBe('k3')
    expect(await list.step('k4', 9)).toBe('k5')
    expect(await list.step('gone', 1)).toBe('gone')
    const empty = cursorPages(server([], 3).source)
    await settle()
    expect([empty.count.get(), empty.ended.get(), await empty.keysAt(0, 5)]).toEqual([0, true, []])
    expect(await empty.step(undefined, 1)).toBeUndefined()
  })
})
