import { describe, expect, test } from 'bun:test'

import { menuKey } from './menu-keys.js'

describe('a key in a menu', () => {
  test('moves, chooses or closes', () => {
    expect(['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', 'Escape', 'a'].map((key) => menuKey(key, false))).toEqual([
      'down',
      'up',
      'home',
      'end',
      'choose',
      'close',
      undefined,
    ])
  })

  test('in the search field, only moves up and down, chooses or closes; the rest type', () => {
    expect(['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', 'Escape'].map((key) => menuKey(key, true))).toEqual([
      'down',
      'up',
      undefined,
      undefined,
      'choose',
      'close',
    ])
  })
})
