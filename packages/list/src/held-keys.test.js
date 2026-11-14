import { describe, expect, test } from 'bun:test'

import { heldKeys } from './held-keys.js'

describe('heldKeys', () => {
  test('moves a held key whose item is removed to the side it names, and to the other at an end', () => {
    /** @type {import('./held-keys.js').HeldKeys<string>} */
    const holds = heldKeys()
    const next = holds.hold('b', 'next')
    const previous = holds.hold('b', 'previous')
    const none = holds.hold('b', 'none')
    const last = holds.hold('d', 'next')
    /** @type {(readonly string[])[]} */
    const heard = []
    next.watch((keys) => {
      heard.push(keys)
    })
    holds.remove([
      { key: 'b', next: 'c', previous: 'a' },
      { key: 'd', next: undefined, previous: 'c' },
    ])
    expect([next.get(), previous.get(), none.get(), last.get()]).toEqual(['c', 'a', undefined, 'c'])
    expect(heard).toEqual([['b', 'c']])
  })

  test('passes over neighbours removed in the same edit, whatever order they are reported in', () => {
    /** @type {import('./held-keys.js').HeldKeys<string>} */
    const holds = heldKeys()
    const next = holds.hold('b', 'next')
    const previous = holds.hold('c', 'previous')
    holds.remove([
      { key: 'c', next: 'd', previous: 'b' },
      { key: 'b', next: 'c', previous: 'a' },
    ])
    expect([next.get(), previous.get()]).toEqual(['d', 'a'])
  })

  test('goes to none when every neighbour is removed, even when the removals name each other in a loop', () => {
    /** @type {import('./held-keys.js').HeldKeys<string>} */
    const holds = heldKeys()
    const held = holds.hold('a', 'next')
    holds.remove([
      { key: 'a', next: 'b', previous: undefined },
      { key: 'b', next: 'a', previous: 'a' },
    ])
    expect(held.get()).toBeUndefined()
  })

  test('has every hold moved before any of them is heard', () => {
    /** @type {import('./held-keys.js').HeldKeys<string>} */
    const holds = heldKeys()
    const first = holds.hold('a', 'next')
    const second = holds.hold('a', 'previous')
    /** @type {(string | undefined)[]} */
    const seen = []
    first.watch(() => {
      seen.push(first.get(), second.get())
    })
    holds.remove([{ key: 'a', next: 'b', previous: 'z' }])
    expect(seen).toEqual(['b', 'z'])
  })

  test('never holds a key removed earlier, as a late answer might set', () => {
    /** @type {import('./held-keys.js').HeldKeys<string>} */
    const holds = heldKeys()
    const held = holds.hold('a', 'none')
    holds.remove([{ key: 'b', next: 'c', previous: 'a' }])
    held.set('b')
    expect(held.get()).toBe('a')
    expect(holds.hold('b', 'next').get()).toBeUndefined()
    held.set('c')
    expect([held.get(), held.has('c')]).toEqual(['c', true])
    held.set(undefined)
    expect(held.get()).toBeUndefined()
  })

  test('holds a removed key again once the list has it again, as arrayList does', () => {
    /** @type {import('./held-keys.js').HeldKeys<string>} */
    const holds = heldKeys()
    const held = holds.hold('a', 'none')
    holds.remove([{ key: 'b', next: 'c', previous: 'a' }])
    held.set('b')
    expect(held.get()).toBe('a')
    holds.add(['b'])
    held.set('b')
    expect(held.get()).toBe('b')
    expect(holds.hold('b', 'next').get()).toBe('b')
  })
})
