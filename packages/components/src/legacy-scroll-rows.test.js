// Legacy: tests of a module the menu, palette and combobox still run on until they are rebuilt (docs/design.md).
import { describe, expect, test } from 'bun:test'

import { ScrollRows } from './legacy-scroll-rows.js'

const COUNT = 1000
const ROWS = 10
const OVERSCAN = 2
const START = 0
const ONE = 1
const MIDDLE = 500

/**
 * Rows over a thousand items, ten showing, starting at `top`.
 * @param {number} top - The position at the top
 * @returns {ScrollRows} The rows
 */
function rowsAt(top) {
  return new ScrollRows({ count: () => COUNT, overscan: OVERSCAN, rows: ROWS, top })
}

describe('ScrollRows', () => {
  test('renders what shows and the overscan either side, kept inside the items', () => {
    expect(rowsAt(MIDDLE).window()).toEqual({ end: MIDDLE + ROWS + OVERSCAN, start: MIDDLE - OVERSCAN })
    expect(rowsAt(START).window()).toEqual({ end: ROWS + OVERSCAN, start: START })
  })

  test('scrolls no further than shows the last item in the last row', () => {
    const rows = rowsAt(START)
    rows.scrollTo(COUNT)
    expect(rows.top.get()).toBe(COUNT - ROWS)
  })

  test('reveals a position by scrolling just far enough', () => {
    const rows = rowsAt(MIDDLE)
    rows.reveal(MIDDLE + ROWS)
    expect(rows.top.get()).toBe(MIDDLE + ONE)
    rows.reveal(MIDDLE - ONE)
    expect(rows.top.get()).toBe(MIDDLE - ONE)
  })

  test('renders the active item too when it is outside the window', () => {
    expect(rowsAt(MIDDLE).positions(START).at(-ONE)).toBe(START)
    expect(rowsAt(MIDDLE).positions(MIDDLE)).toHaveLength(ROWS + OVERSCAN + OVERSCAN)
  })
})
