import { describe, expect, test } from 'bun:test'

import { keyAction } from './listbox-keys.js'

const PLAIN = { shift: false, toggle: false }
const TOGGLE = { shift: false, toggle: true }
const SHIFT = { shift: true, toggle: false }

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

  test('leaves other keys, and other keys with the toggle modifier, alone', () => {
    expect(keyAction('x', PLAIN)).toBeUndefined()
    expect(keyAction('ArrowDown', TOGGLE)).toBeUndefined()
  })
})
