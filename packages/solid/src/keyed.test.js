import { describe, expect, test } from 'bun:test'

import { arrayList, keySet } from '@pterror/interact-list'
import { createRoot, createSignal } from 'solid-js'

import { adapter, flush, fromKeyed, fromTest } from '#test-solid'

describe('fromTest', () => {
  test('reruns only the computations reading the keys a change names', () => {
    const keys = Array.from({ length: 100 }, (_, index) => `k${String(index)}`)
    const list = arrayList(keys)
    const active = list.hold('k0', 'next')
    /** @type {Map<string, number>} */
    const runs = new Map()
    createRoot(() => {
      const isActive = fromTest(active)
      for (const key of keys) {
        adapter.renderEffect(
          () => isActive(key),
          () => {
            runs.set(key, (runs.get(key) ?? 0) + 1)
          },
          false,
        )
      }
    })
    active.set('k5')
    flush()
    const rerun = keys.filter((key) => (runs.get(key) ?? 0) > 1)
    expect(rerun).toEqual(['k0', 'k5'])
  })

  test('rereads only the keys being read when a change names none, and answers at once outside a computation', () => {
    const closed = keySet(['a'])
    /** @type {string[]} */
    const asked = []
    /** @type {Set<(keys?: readonly string[]) => void>} */
    const listeners = new Set()
    const closedTest = {
      has: (/** @type {string} */ key) => {
        asked.push(key)
        return closed.has(key)
      },
      watch: (/** @type {(keys?: readonly string[]) => void} */ listener) => {
        listeners.add(listener)
        return () => {
          listeners.delete(listener)
        }
      },
    }
    /** @type {boolean[]} */
    const seen = []
    const dispose = createRoot((disposeRoot) => {
      const isClosed = fromTest(closedTest)
      adapter.renderEffect(
        () => isClosed('a'),
        (closedNow) => {
          seen.push(closedNow)
        },
        false,
      )
      expect(isClosed('z')).toBe(false)
      return disposeRoot
    })
    asked.length = 0
    closed.delete('a')
    for (const listener of listeners) {
      listener()
    }
    flush()
    expect(asked).toEqual(['a'])
    expect(seen).toEqual([true, false])
    dispose()
    expect(listeners.size).toBe(0)
  })
})

describe('fromKeyed', () => {
  test('follows a key only while a computation reads it', async () => {
    const [nodes, setNodes] = createSignal(new Map([['a', 'Alpha']]))
    /** @type {Set<(keys?: readonly string[]) => void>} */
    const listeners = new Set()
    /** @type {string[]} */
    const read = []
    const [showing, setShowing] = createSignal(true)
    /** @type {(string | undefined)[]} */
    const seen = []
    createRoot(() => {
      const nodeOf = fromKeyed(
        (/** @type {string} */ key) => {
          read.push(key)
          return nodes().get(key)
        },
        (listener) => {
          listeners.add(listener)
          return () => {
            listeners.delete(listener)
          }
        },
      )
      adapter.renderEffect(
        () => (showing() ? [nodeOf('a')] : []),
        (/** @type {readonly (string | undefined)[]} */ shown) => {
          seen.push(...shown)
        },
        false,
      )
    })
    setNodes(new Map([['a', 'Alpha, renamed']]))
    flush()
    for (const listener of listeners) {
      listener(['a'])
    }
    flush()
    expect(seen).toEqual(['Alpha', 'Alpha, renamed'])
    setShowing(false)
    flush()
    await Promise.resolve()
    read.length = 0
    for (const listener of listeners) {
      listener()
    }
    expect(read).toEqual([])
  })
})
