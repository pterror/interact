import { describe, expect, test } from 'bun:test'

import { arrayList } from './array-list.js'

describe('arrayList', () => {
  test('gives its keys and tells watchers when they change', () => {
    const list = arrayList(['a', 'b'])
    let heard = 0
    list.watch(() => {
      heard += 1
    })
    list.set(['b', 'c'])
    expect(list.keys()).toEqual(['b', 'c'])
    expect(heard).toBe(1)
  })

  test('holds only keys it has', () => {
    const list = arrayList(['a', 'b'])
    expect(list.hold('z', 'next').get()).toBeUndefined()
    const held = list.hold('a', 'next')
    held.set('z')
    expect(held.get()).toBe('a')
    held.set('b')
    expect(held.has('b')).toBe(true)
    held.set(undefined)
    expect(held.get()).toBeUndefined()
  })

  test('tells a held key change with the key it left and the key it arrived at', () => {
    const list = arrayList(['a', 'b'])
    const held = list.hold('a', 'next')
    /** @type {(readonly string[])[]} */
    const heard = []
    held.watch((keys) => {
      heard.push(keys)
    })
    held.set('b')
    held.set('b')
    held.set(undefined)
    expect(heard).toEqual([['a', 'b'], ['b']])
  })

  test('moves a held key whose item is removed, before anyone hears of the edit', () => {
    const list = arrayList(['a', 'b', 'c', 'd'])
    const next = list.hold('b', 'next')
    const previous = list.hold('c', 'previous')
    const none = list.hold('b', 'none')
    /** @type {(string | undefined)[]} */
    const seen = []
    list.watch(() => {
      seen.push(next.get(), previous.get(), none.get())
    })
    list.set(['a', 'd'])
    expect(seen).toEqual(['d', 'a', undefined])
  })

  test('moves a held key the other way at the ends, and to none when the list empties', () => {
    const list = arrayList(['a', 'b', 'c'])
    const last = list.hold('c', 'next')
    const first = list.hold('a', 'previous')
    list.set(['b'])
    expect([last.get(), first.get()]).toEqual(['b', 'b'])
    list.set([])
    expect([last.get(), first.get()]).toEqual([undefined, undefined])
  })
})
