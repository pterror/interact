import { describe, expect, test } from 'bun:test'

import { cell } from '@pterror/interact-list'
import { batch, createMemo, createRenderEffect, createRoot, createSignal } from 'solid-js'

import { fromWatched } from './from-watched.js'
import { toDrawn } from './to-drawn.js'
import { toSet } from './to-set.js'
import { toValue } from './to-value.js'
import { toWatched } from './to-watched.js'

/**
 * A value that is a function
 * @returns {string} Which it is
 */
function first() {
  return 'first'
}

describe('toWatched', () => {
  test('tells a listener each change, as the write happens, and only when the value is another one', () => {
    const [count, setCount] = createSignal(1)
    const parity = toWatched(() => count() % 2)
    /** @type {number[]} */
    const heard = []
    const stop = parity.watch(() => {
      heard.push(parity.get())
    })
    setCount(3)
    expect(heard).toEqual([])
    setCount(4)
    expect(heard).toEqual([0])
    batch(() => {
      setCount(5)
      setCount(6)
      expect(heard).toEqual([0])
    })
    expect(heard).toEqual([0])
    setCount(7)
    expect(heard).toEqual([0, 1])
    stop()
    setCount(8)
    expect(heard).toEqual([0, 1])
  })

  test('is read without being tracked by the computation that reads it, nor by what its listener reads', () => {
    const [shown, setShown] = createSignal('a')
    const [other, setOther] = createSignal(0)
    const watched = toWatched(shown)
    let runs = 0
    let listened = 0
    createRoot(() => {
      createRenderEffect(() => {
        runs += 1
        watched.get()
      })
    })
    watched.watch(() => {
      listened += 1
      other()
    })
    setShown('b')
    setOther(1)
    expect([runs, listened]).toEqual([1, 1])
  })

  test('gives a memo of keys as a Drawn', () => {
    const [keys, setKeys] = createSignal(['a', 'b'])
    const drawn = toDrawn(createRoot(() => createMemo(keys)))
    /** @type {(readonly string[])[]} */
    const heard = []
    drawn.watch(() => {
      heard.push(drawn.keys())
    })
    setKeys(['b'])
    expect(heard).toEqual([['b']])
  })
})

describe('toValue and toSet', () => {
  test('read a signal untracked, and store a function as a value rather than calling it', () => {
    const [action, setAction] = createSignal(first)
    const value = toValue(action)
    const set = toSet(setAction)
    let runs = 0
    createRoot(() => {
      createRenderEffect(() => {
        runs += 1
        value()
      })
    })
    set(() => 'second')
    expect(value()()).toBe('second')
    expect(runs).toBe(1)
  })
})

describe('fromWatched', () => {
  test('follows a Watched, reruns only for another value, and stops listening with its owner', () => {
    const active = cell('a')
    let listening = 0
    const watched = {
      get: active.get,
      watch: (/** @type {() => void} */ listener) => {
        listening += 1
        const stop = active.watch(listener)
        return () => {
          listening -= 1
          stop()
        }
      },
    }
    /** @type {string[]} */
    const seen = []
    const dispose = createRoot((disposeRoot) => {
      const value = fromWatched(watched)
      createRenderEffect(() => {
        seen.push(value())
      })
      return disposeRoot
    })
    active.set('b')
    active.set('b')
    expect(seen).toEqual(['a', 'b'])
    expect(listening).toBe(1)
    dispose()
    expect(listening).toBe(0)
    active.set('c')
    expect(seen).toEqual(['a', 'b'])
  })
})
