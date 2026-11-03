import { describe, expect, test } from 'bun:test'

import { entry, move } from './focus.js'

const COUNT = 5
const FIRST = 0
const MIDDLE = 2
const NEXT = 3
const LAST = 4
const FORWARD = 1

describe('entry', () => {
  test('goes back to where focus left while that is inside, else to the first, and nowhere when empty', () => {
    expect(entry(MIDDLE, COUNT)).toBe(MIDDLE)
    expect(entry(COUNT, COUNT)).toBe(FIRST)
    expect(entry(undefined, COUNT)).toBe(FIRST)
    expect(entry(MIDDLE, FIRST)).toBeUndefined()
  })
})

describe('move', () => {
  test('moves by any amount and stays inside', () => {
    expect(move(MIDDLE, FORWARD, COUNT)).toBe(NEXT)
    expect(move(MIDDLE, -COUNT, COUNT)).toBe(FIRST)
    expect(move(MIDDLE, COUNT, COUNT)).toBe(LAST)
  })
})
