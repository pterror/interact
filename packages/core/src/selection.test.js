/**
 * @import { Span } from './memory-source.js'
 * @import { Selection } from './selection.js'
 * @import { Source } from './source.js'
 */

import { describe, expect, test } from 'bun:test'

import { MemorySource } from './memory-source.js'
import { countSelected, isSelected, nothing, only, spanning, toggle } from './selection.js'

/** @typedef {Readonly<{ id: string }>} Item */

const FIRST = 0
const SECOND = 1
const FIFTH = 4
const SPANNED = 3

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
