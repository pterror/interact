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
