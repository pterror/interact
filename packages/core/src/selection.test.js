/**
 * @import { Span } from './memory-source.js'
 * @import { Selection } from './selection.js'
 * @import { Source } from './source.js'
 */

import { describe, expect, test } from 'bun:test'

import { MemorySource } from './memory-source.js'
import {
  countSelected,
  findsSelected,
  firstSelected,
  isSelected,
  nothing,
  only,
  spanning,
  toggle,
} from './selection.js'

/** @typedef {Readonly<{ id: string }>} Item */

const FIRST = 0
const SECOND = 1
const FIFTH = 4
const SPANNED = 3
const THIRD = 2
const FOURTH = 3

/**
 * A source over items with ids "a" to "f".
 * @returns {MemorySource<Item>} The source
 */
function lettered() {
  /** @type {readonly Item[]} */
  const items = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({ id }))
  return new MemorySource(items, (item) => item.id)
}

/**
 * The ids an item-by-item check says are selected.
 * @param {Selection<Span>} selection - The selection
 * @param {MemorySource<Item>} items - Its source
 * @returns {string[]} The selected ids
 */
function selectedIds(selection, items) {
  /** @type {Source<Item, Span>} */
  const source = items
  return items
    .read(FIRST, items.count())
    .filter((item) => isSelected(selection, source, item))
    .map((item) => item.id)
}

describe('selection', () => {
  test('starts empty, and selects one item or a span', async () => {
    const items = lettered()
    expect(selectedIds(nothing(), items)).toEqual([])
    expect(selectedIds(only(items, { id: 'c' }), items)).toEqual(['c'])
    const span = spanning(items, SECOND, FIFTH)
    expect(selectedIds(span, items)).toEqual(['b', 'c', 'd'])
    expect(await countSelected(span, items)).toBe(SPANNED)
  })

  test('deselects inside the span by key and selects beyond it by key, and counts both', async () => {
    const items = lettered()
    const changed = toggle(toggle(spanning(items, SECOND, FIFTH), items, { id: 'c' }), items, { id: 'f' })
    expect(selectedIds(changed, items)).toEqual(['b', 'd', 'f'])
    expect(await countSelected(changed, items)).toBe(SPANNED)
    expect(selectedIds(toggle(changed, items, { id: 'c' }), items)).toEqual(['b', 'c', 'd', 'f'])
  })

  test('keeps meaning the same items as others are inserted around them', () => {
    const items = lettered()
    const span = spanning(items, SECOND, FIFTH)
    items.insert(FIRST, [{ id: 'x' }])
    expect(selectedIds(span, items)).toEqual(['b', 'c', 'd'])
  })
})

/**
 * Whether a promise rejects.
 * @param {Promise<unknown>} promise - The promise
 * @returns {Promise<boolean>} Whether it rejected
 */
async function rejects(promise) {
  try {
    await promise
    return false
  } catch {
    return true
  }
}

describe('the first selected item', () => {
  test('is nowhere when nothing is selected', async () => {
    const items = lettered()
    expect(findsSelected(nothing(), items)).toBe(true)
    expect(await firstSelected(nothing(), items)).toBeUndefined()
  })

  test("is the span's first item not deselected, or an item selected before it", async () => {
    const items = lettered()
    const span = spanning(items, SECOND, FIFTH)
    expect(await firstSelected(toggle(span, items, { id: 'b' }), items)).toBe(THIRD)
    const later = spanning(items, FOURTH, FIFTH)
    expect(await firstSelected(toggle(later, items, { id: 'b' }), items)).toBe(SECOND)
    expect(await firstSelected(only(items, { id: 'e' }), items)).toBe(FIFTH)
  })

  test('counts a key both added and removed only while the span misses it, as isSelected does', async () => {
    const items = lettered()
    const inside = { ...spanning(items, SECOND, FIFTH), added: new Set(['c']), removed: new Set(['b', 'c']) }
    expect(await firstSelected(inside, items)).toBe(FOURTH)
    const outside = { ...spanning(items, FOURTH, FIFTH), added: new Set(['c']), removed: new Set(['c']) }
    expect(await firstSelected(outside, items)).toBe(THIRD)
    expect(selectedIds(outside, items)).toEqual(['c', 'd'])
  })

  test('is unknown to a source that can place nothing', async () => {
    const items = lettered()
    /** @type {Source<Item, Span>} */
    const bare = {
      count: () => items.count(),
      countMatching: (span) => items.countMatching(span),
      key: (item) => items.key(item),
      matches: (span, item) => items.matches(span, item),
      read: (start, end) => items.read(start, end),
      span: (start, end) => items.span(start, end),
      subscribe: (listener) => items.subscribe(listener),
    }
    const span = spanning(items, SECOND, FIFTH)
    expect([findsSelected(span, bare), findsSelected(only(items, { id: 'a' }), bare)]).toEqual([false, false])
    expect(await rejects(firstSelected(span, bare))).toBe(true)
  })
})
