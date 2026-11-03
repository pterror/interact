import { describe, expect, test } from 'bun:test'

import { shiftPosition } from './source.js'

const AT = 10
const BEFORE = 4
const START = 5
const END = 8
const MOVED = 3

describe('shiftPosition', () => {
  test('moves a position later by what is inserted at or before it', () => {
    expect(shiftPosition(AT, { end: END, kind: 'inserted', start: START })).toBe(AT + MOVED)
    expect(shiftPosition(START, { end: END, kind: 'inserted', start: START })).toBe(START + MOVED)
    expect(shiftPosition(BEFORE, { end: END, kind: 'inserted', start: START })).toBe(BEFORE)
  })

  test('moves a position earlier by what is removed before it, and loses one removed', () => {
    expect(shiftPosition(AT, { end: END, kind: 'removed', start: START })).toBe(AT - MOVED)
    expect(shiftPosition(START, { end: END, kind: 'removed', start: START })).toBeUndefined()
    expect(shiftPosition(BEFORE, { end: END, kind: 'removed', start: START })).toBe(BEFORE)
  })

  test('keeps a position through a change in place, and loses every one in a reset', () => {
    expect(shiftPosition(START, { end: END, kind: 'changed', start: START })).toBe(START)
    expect(shiftPosition(START, { kind: 'reset' })).toBeUndefined()
  })
})
