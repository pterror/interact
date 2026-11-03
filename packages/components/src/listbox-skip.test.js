/** @import { Span } from '@interact/core/memory-source' */

import { describe, expect, test } from 'bun:test'

import { MemorySource } from '@interact/core'

import { Listbox } from './listbox.js'

const SEPARATOR = '—'
const PLAIN = { shift: false, toggle: false }
const ROWS = 10
const NONE = 0
const ONE = 1
const TWO = 2
const THREE = 3
const FIVE = 5

/** @typedef {Readonly<{ id: number, label: string }>} Labelled */

/**
 * A listbox over labels with separators in them, which focus passes over, focused.
 * @param {readonly string[]} labels - The labels
 * @returns {Listbox<Labelled, Span>} The listbox
 */
function withSeparators(labels) {
  /** @type {readonly Labelled[]} */
  const items = labels.map((label, id) => ({ id, label }))
  const listbox = new Listbox({
    mode: 'none',
    rows: ROWS,
    skip: (item) => item.label === SEPARATOR,
    source: new MemorySource(items, (item) => item.id),
    text: (item) => (item.label === SEPARATOR ? '' : item.label),
  })
  listbox.focus()
  return listbox
}

/**
 * Presses keys in turn, noting where each left the active item.
 * @param {Listbox<Labelled, Span>} listbox - The listbox
 * @param {readonly string[]} keys - The keys
 * @returns {(number | undefined)[]} Where each left it
 */
function pressing(listbox, keys) {
  return keys.map((key) => {
    listbox.key(key, PLAIN)
    return listbox.active.get()
  })
}

describe('a listbox whose separators focus passes over', () => {
  test('enters past a separator at the top', () => {
    expect(withSeparators([SEPARATOR, 'Cut', 'Copy']).active.get()).toBe(ONE)
  })

  test('steps over separators with the arrows, Home and End', () => {
    const listbox = withSeparators(['Cut', SEPARATOR, 'Copy', 'Paste', SEPARATOR, 'Undo', SEPARATOR])
    const keys = ['ArrowDown', 'ArrowDown', 'ArrowDown', 'End', 'ArrowDown', 'Home', 'ArrowUp']
    expect(pressing(listbox, keys)).toEqual([TWO, THREE, FIVE, FIVE, FIVE, NONE, NONE])
  })

  test('selects nothing as focus moves, with no selection', () => {
    const listbox = withSeparators(['Cut', 'Copy', 'Paste'])
    pressing(listbox, ['ArrowDown', ' ', 'End'])
    expect([listbox.choose.isSelected(ONE), listbox.selection.get().filter, listbox.active.get()]).toEqual([
      false,
      undefined,
      TWO,
    ])
  })
})
