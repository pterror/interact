import { describe, expect, test } from 'bun:test'

import { keyAction } from './listbox-keys.js'

const PLAIN = { shift: false, toggle: false }
const TOGGLE = { shift: false, toggle: true }
const SHIFT = { shift: true, toggle: false }
const TOGGLE_SHIFT = { shift: true, toggle: true }

describe('keyAction', () => {
  test('moves by rows, pages, or to either end', () => {
    expect(keyAction('ArrowDown', PLAIN)).toEqual({ kind: 'move', pages: 0, rows: 1 })
    expect(keyAction('PageUp', SHIFT)).toEqual({ kind: 'move', pages: -1, rows: 0 })
    expect(keyAction('Home', PLAIN)).toEqual({ kind: 'first' })
    expect(keyAction('End', PLAIN)).toEqual({ kind: 'last' })
  })

  test('toggles, activates and selects everything', () => {
    expect(keyAction(' ', PLAIN)).toEqual({ kind: 'toggle' })
    expect(keyAction('Enter', PLAIN)).toEqual({ kind: 'activate' })
    expect(keyAction('a', TOGGLE)).toEqual({ kind: 'all' })
    expect(keyAction('A', TOGGLE)).toEqual({ kind: 'all' })
  })

  test('selects through from the anchor, and from the active item to either end', () => {
    expect(keyAction(' ', SHIFT)).toEqual({ kind: 'through' })
    expect(keyAction('Home', TOGGLE_SHIFT)).toEqual({ kind: 'toFirst' })
    expect(keyAction('End', TOGGLE_SHIFT)).toEqual({ kind: 'toLast' })
  })

  test('looks for an item by any other character typed, Shift or not', () => {
    expect(keyAction('x', PLAIN)).toEqual({ character: 'x', kind: 'type' })
    expect(keyAction('X', SHIFT)).toEqual({ character: 'X', kind: 'type' })
    expect(keyAction('é', PLAIN)).toEqual({ character: 'é', kind: 'type' })
  })

  test('leaves other keys, and other keys with the toggle modifier, alone', () => {
    expect(keyAction('Tab', PLAIN)).toBeUndefined()
    expect(keyAction('x', TOGGLE)).toBeUndefined()
    expect(keyAction('ArrowDown', TOGGLE)).toBeUndefined()
    expect(keyAction('a', TOGGLE_SHIFT)).toBeUndefined()
  })
})
