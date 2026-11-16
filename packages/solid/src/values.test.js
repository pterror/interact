import { describe, expect, test } from 'bun:test'

import { cell } from '@pterror/interact-list'
import { createMemo, createRoot, createSignal } from 'solid-js'

import { adapter, batch, flush, fromWatched, toDrawn, toSet, toValue, toWatched } from '#test-solid'

/** @import { Signal } from 'solid-js' */

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
    flush()
    expect(heard).toEqual([])
    setCount(4)
    flush()
    expect(heard).toEqual([0])
    batch(() => {
      setCount(5)
      setCount(6)
      expect(heard).toEqual([0])
    })
    flush()
    expect(heard).toEqual([0])
    setCount(7)
    flush()
    expect(heard).toEqual([0, 1])
    stop()
    setCount(8)
    flush()
    expect(heard).toEqual([0, 1])
  })

  test('is read without being tracked by the computation that reads it, nor by what its listener reads', () => {
    const [shown, setShown] = createSignal('a')
    const [other, setOther] = createSignal(0)
    const watched = toWatched(shown)
    let runs = 0
    let listened = 0
    createRoot(() => {
      adapter.renderEffect(
        () => {
          runs += 1
          return watched.get()
        },
        () => {
          // Only whether the computation reruns is checked
        },
        false,
      )
    })
    watched.watch(() => {
      listened += 1
      other()
    })
    setShown('b')
    flush()
    setOther(1)
    flush()
    expect([runs, listened]).toEqual([1, 1])
  })

  test('stops telling its listeners when the owner it was made in goes, for a watcher that never stops', () => {
    const [count, setCount] = createSignal(1)
    /** @type {number[]} */
    const heard = []
    const dispose = createRoot((disposeRoot) => {
      const watched = toWatched(count)
      watched.watch(() => {
        heard.push(watched.get())
      })
      return disposeRoot
    })
    setCount(2)
    flush()
    dispose()
    setCount(3)
    flush()
    expect(heard).toEqual([2])
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
    flush()
    expect(heard).toEqual([['b']])
  })
})

describe('toValue and toSet', () => {
  test('read a signal untracked, and store a function as a value rather than calling it', () => {
    /** @type {Signal<(() => string) | undefined>} */
    const [action, setAction] = createSignal()
    const value = toValue(action)
    const set = toSet(setAction)
    let runs = 0
    createRoot(() => {
      adapter.renderEffect(
        () => {
          runs += 1
          return value()
        },
        () => {
          // Only whether the computation reruns is checked
        },
        false,
      )
    })
    set(() => 'second')
    flush()
    expect(value()?.()).toBe('second')
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
      adapter.renderEffect(
        value,
        (shown) => {
          seen.push(shown)
        },
        false,
      )
      return disposeRoot
    })
    active.set('b')
    flush()
    active.set('b')
    flush()
    expect(seen).toEqual(['a', 'b'])
    expect(listening).toBe(1)
    dispose()
    expect(listening).toBe(0)
    active.set('c')
    flush()
    expect(seen).toEqual(['a', 'b'])
  })
})
