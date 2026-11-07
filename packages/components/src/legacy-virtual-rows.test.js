// Legacy: tests of a module the menu, palette and combobox still run on until they are rebuilt (docs/design.md).
import { describe, expect, test } from 'bun:test'

import {
  MAX_SCROLL_PIXELS,
  UNMEASURED_ROWS,
  clamp,
  offsetFor,
  rowAt,
  rowCap,
  virtualRows,
} from './legacy-virtual-rows.js'

const TEN_BILLION = 10_000_000_000
const ROWS = 10
const HALF = 2
const QUARTER = 4
const START = 0
const ONE = 1
const ROW_HEIGHT = 32
const FIVE_BILLION = 5_000_000_000
const CAP = 100_000
const ZOOMED = 2

describe('rowCap', () => {
  test('keeps the scrollable rows inside the tallest area every browser makes, zoom included', () => {
    expect(rowCap(ROW_HEIGHT)).toBe(Math.floor(MAX_SCROLL_PIXELS / ROW_HEIGHT) - ONE)
    expect((rowCap(ROW_HEIGHT) + ONE) * ROW_HEIGHT).toBeLessThanOrEqual(MAX_SCROLL_PIXELS)
    expect(rowCap(ROW_HEIGHT * ZOOMED) * ROW_HEIGHT * ZOOMED).toBeLessThan(MAX_SCROLL_PIXELS)
    expect(rowCap(MAX_SCROLL_PIXELS * ZOOMED)).toBe(ONE)
  })

  test('starts at a cap that holds for rows up to 1,789px', () => {
    expect(UNMEASURED_ROWS).toBeLessThanOrEqual(rowCap(Math.floor(MAX_SCROLL_PIXELS / UNMEASURED_ROWS)))
  })
})

describe('virtualRows', () => {
  test('is the count, up to the cap', () => {
    expect(virtualRows(ROWS, CAP)).toBe(ROWS)
    expect(virtualRows(TEN_BILLION, CAP)).toBe(CAP)
  })
})

describe('offsetFor', () => {
  test('keeps the offset while the top is well inside the scrollable rows', () => {
    const offset = FIVE_BILLION - CAP / HALF
    expect(offsetFor({ cap: CAP, count: TEN_BILLION, offset, rows: ROWS, top: FIVE_BILLION + ROWS })).toBe(offset)
  })

  test('centres the top when it nears an end that can move', () => {
    const offset = FIVE_BILLION
    const nearStart = offset + CAP / QUARTER - ONE
    const centred = offsetFor({ cap: CAP, count: TEN_BILLION, offset, rows: ROWS, top: nearStart })
    expect(nearStart - centred).toBe((CAP - ROWS) / HALF)
  })

  test('stays at a real end', () => {
    expect(offsetFor({ cap: CAP, count: TEN_BILLION, offset: START, rows: ROWS, top: ONE })).toBe(START)
    const last = TEN_BILLION - CAP
    expect(offsetFor({ cap: CAP, count: TEN_BILLION, offset: last, rows: ROWS, top: TEN_BILLION - ROWS })).toBe(last)
  })

  test('jumps anywhere at once, the top landing on its own row', () => {
    const offset = offsetFor({ cap: CAP, count: TEN_BILLION, offset: START, rows: ROWS, top: FIVE_BILLION })
    expect(FIVE_BILLION - offset).toBeGreaterThanOrEqual(START)
    expect(FIVE_BILLION - offset).toBeLessThanOrEqual(CAP - ROWS)
  })

  test('moves the offset when a smaller cap leaves the top outside the scrollable rows', () => {
    const offset = FIVE_BILLION - CAP / HALF
    const smaller = CAP / QUARTER
    const moved = offsetFor({ cap: smaller, count: TEN_BILLION, offset, rows: ROWS, top: FIVE_BILLION })
    expect(FIVE_BILLION - moved).toBeLessThanOrEqual(smaller - ROWS)
  })

  test('needs no offset for a count under the cap', () => {
    expect(offsetFor({ cap: CAP, count: ROWS * ROWS, offset: START, rows: ROWS, top: ROWS })).toBe(START)
  })
})

describe('rowAt', () => {
  test('is the row at the top, forgiving rounding by half a pixel', () => {
    expect(rowAt(ROW_HEIGHT * ROWS, ROW_HEIGHT)).toBe(ROWS)
    expect(rowAt(ROW_HEIGHT * ROWS - ONE / QUARTER, ROW_HEIGHT)).toBe(ROWS)
    expect(rowAt(ROW_HEIGHT * ROWS - ONE, ROW_HEIGHT)).toBe(ROWS - ONE)
  })
})

describe('clamp', () => {
  test('keeps a number between bounds', () => {
    expect(clamp(-ONE, START, ROWS)).toBe(START)
    expect(clamp(ROWS + ONE, START, ROWS)).toBe(ROWS)
  })
})
