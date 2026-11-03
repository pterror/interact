/**
 * @import { Change } from './source.js'
 */

import { describe, expect, test } from 'bun:test'

import { MemorySource } from './memory-source.js'

/** @typedef {Readonly<{ id: string }>} Item */

/**
 * A source over items with the given ids.
 * @param {readonly string[]} ids - One per item
 * @returns {MemorySource<Item>} The source
 */
function withIds(ids) {
  /** @type {readonly Item[]} */
  const items = ids.map((id) => ({ id }))
  return new MemorySource(items, (item) => item.id)
}

const FIRST = 0
const SECOND = 1
const THIRD = 2
const FOURTH = 3
const FIFTH = 4

describe('MemorySource', () => {
  test('reads items by position, and reports each change', () => {
    const source = withIds(['a', 'b', 'c', 'd'])
    /** @type {Change[]} */
    const changes = []
    source.subscribe((change) => {
      changes.push(change)
    })
    source.insert(SECOND, [{ id: 'x' }])
    source.remove(FOURTH, FIFTH)
    source.replace(SECOND, [{ id: 'y' }])
    expect(source.read(SECOND, FOURTH).map((item) => item.id)).toEqual(['y', 'b'])
    expect(source.count()).toBe(FOURTH + SECOND)
    expect(changes).toEqual([
      { end: THIRD, kind: 'inserted', start: SECOND },
      { end: FIFTH, kind: 'removed', start: FOURTH },
      { end: THIRD, kind: 'changed', start: SECOND },
    ])
  })

  test('keeps a span meaning the same items as others move around them', () => {
    const source = withIds(['a', 'b', 'c', 'd', 'e'])
    const span = source.span(SECOND, FIFTH)
    source.insert(SECOND, [{ id: 'x' }])
    expect(source.matches(span, { id: 'x' })).toBe(false)
    expect(source.matches(span, { id: 'b' })).toBe(true)
    expect(source.matches(span, { id: 'd' })).toBe(true)
    expect(source.matches(span, { id: 'e' })).toBe(false)
    expect(source.countMatching(span)).toBe(FOURTH)
  })

  test('counts a span whose end has gone as empty, and refuses one with no items', () => {
    const source = withIds(['a', 'b', 'c'])
    const span = source.span(SECOND, FOURTH)
    source.remove(SECOND, THIRD)
    expect(source.countMatching(span)).toBe(SECOND - SECOND)
    expect(() => source.span(SECOND, SECOND)).toThrow(RangeError)
  })
})

describe('MemorySource placing', () => {
  test('says where a key is, and nothing for one not there', () => {
    const source = withIds(['a', 'b', 'c'])
    expect([source.positionOf('c'), source.positionOf('z')]).toEqual([THIRD, undefined])
    source.insert(FIRST, [{ id: 'x' }])
    expect(source.positionOf('c')).toBe(FOURTH)
  })

  test("finds a span's first item whose key isn't passed over", () => {
    const source = withIds(['a', 'b', 'c', 'd', 'e'])
    const span = source.span(SECOND, FIFTH)
    expect(source.firstMatching(span, new Set())).toBe(SECOND)
    expect(source.firstMatching(span, new Set(['b', 'c']))).toBe(FOURTH)
    expect(source.firstMatching(span, new Set(['b', 'c', 'd']))).toBeUndefined()
    source.remove(SECOND, THIRD)
    expect(source.firstMatching(span, new Set())).toBeUndefined()
  })
})

describe('MemorySource searching', () => {
  test('finds the first item at or after a position whose text starts with what was typed', () => {
    const source = new MemorySource(['Apple', 'banana', 'Ávila', 'blueberry'], (item) => item)
    expect(source.findPrefix('b', SECOND)).toBe(SECOND)
    expect(source.findPrefix('b', THIRD)).toBe(FOURTH)
    expect(source.findPrefix('a', SECOND)).toBe(THIRD)
    expect(source.findPrefix('blu', FIRST)).toBe(FOURTH)
    expect(source.findPrefix('c', FIRST)).toBeUndefined()
  })

  test('searches the text an app gives its items', () => {
    /** @type {readonly Readonly<{ id: string, name: string }>[]} */
    const named = [{ id: 'x', name: 'Zed' }]
    const source = new MemorySource(
      named,
      (item) => item.id,
      (item) => item.name,
    )
    expect(source.findPrefix('z', FIRST)).toBe(FIRST)
    expect(source.findPrefix('x', FIRST)).toBeUndefined()
  })
})
