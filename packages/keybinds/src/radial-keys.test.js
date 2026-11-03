import { describe, expect, test } from 'bun:test'

import { slotForKey } from './radial-keys.js'

const NONE = -1
const FULL = 8
const EMPTY = 0
const THREE = 3
const TOP = 0
const RIGHT = 2
const BOTTOM = 4
const LEFT = 6

/**
 * A key going down
 * @param {string} key - The key
 * @param {boolean} [shiftKey] - Whether Shift is held (default false)
 * @returns {Readonly<{ key: string, shiftKey: boolean }>} The key
 */
function press(key, shiftKey = false) {
  return { key, shiftKey }
}

describe('the slot a key makes active', () => {
  test.each([
    ['ArrowUp', TOP],
    ['ArrowRight', RIGHT],
    ['ArrowDown', BOTTOM],
    ['ArrowLeft', LEFT],
  ])('is the one %s points at, when every slot is filled', (key, slot) => {
    expect(slotForKey(press(key), { active: NONE, filled: FULL })).toBe(slot)
  })

  test('is the nearest filled one, clockwise first, when the one pointed at is empty', () => {
    expect(slotForKey(press('ArrowDown'), { active: NONE, filled: THREE })).toBe(RIGHT)
    expect(slotForKey(press('ArrowLeft'), { active: NONE, filled: THREE })).toBe(TOP)
  })

  test('goes round the filled slots with Tab, and back with Shift+Tab', () => {
    expect(slotForKey(press('Tab'), { active: NONE, filled: THREE })).toBe(TOP)
    expect(slotForKey(press('Tab'), { active: RIGHT, filled: THREE })).toBe(TOP)
    expect(slotForKey(press('Tab', true), { active: TOP, filled: THREE })).toBe(RIGHT)
    expect(slotForKey(press('Tab', true), { active: NONE, filled: THREE })).toBe(RIGHT)
  })

  test('is -1 for a key that moves when nothing is filled, and undefined for a key that does not move', () => {
    expect([
      slotForKey(press('ArrowUp'), { active: NONE, filled: EMPTY }),
      slotForKey(press('Tab'), { active: NONE, filled: EMPTY }),
    ]).toEqual([NONE, NONE])
    expect(slotForKey(press('Enter'), { active: TOP, filled: FULL })).toBeUndefined()
  })
})
