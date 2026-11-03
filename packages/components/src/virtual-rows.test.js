import { describe, expect, test } from 'bun:test'

import { VIRTUAL_ROWS, clamp, offsetFor, rowAt, virtualRows } from './virtual-rows.js'

const TEN_BILLION = 10_000_000_000
const ROWS = 10
const HALF = 2
const QUARTER = 4
const START = 0
const ONE = 1
const ROW_HEIGHT = 32
const FIVE_BILLION = 5_000_000_000

describe('virtualRows', () => {
  test('is the count, up to the cap', () => {
    expect(virtualRows(ROWS)).toBe(ROWS)
    expect(virtualRows(TEN_BILLION)).toBe(VIRTUAL_ROWS)
  })
})

describe('offsetFor', () => {
  test('keeps the offset while the top is well inside the scrollable rows', () => {
    const offset = FIVE_BILLION - VIRTUAL_ROWS / HALF
    expect(offsetFor({ count: TEN_BILLION, offset, rows: ROWS, top: FIVE_BILLION + ROWS })).toBe(offset)
  })

  test('centres the top when it nears an end that can move', () => {
    const offset = FIVE_BILLION
    const nearStart = offset + VIRTUAL_ROWS / QUARTER - ONE
    const centred = offsetFor({ count: TEN_BILLION, offset, rows: ROWS, top: nearStart })
    expect(nearStart - centred).toBe((VIRTUAL_ROWS - ROWS) / HALF)
  })

  test('stays at a real end', () => {
    expect(offsetFor({ count: TEN_BILLION, offset: START, rows: ROWS, top: ONE })).toBe(START)
    const last = TEN_BILLION - VIRTUAL_ROWS
    expect(offsetFor({ count: TEN_BILLION, offset: last, rows: ROWS, top: TEN_BILLION - ROWS })).toBe(last)
  })

  test('jumps anywhere at once, the top landing on its own row', () => {
    const offset = offsetFor({ count: TEN_BILLION, offset: START, rows: ROWS, top: FIVE_BILLION })
    expect(FIVE_BILLION - offset).toBeGreaterThanOrEqual(START)
    expect(FIVE_BILLION - offset).toBeLessThanOrEqual(VIRTUAL_ROWS - ROWS)
  })

  test('needs no offset for a count under the cap', () => {
    expect(offsetFor({ count: ROWS * ROWS, offset: START, rows: ROWS, top: ROWS })).toBe(START)
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
