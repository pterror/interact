/**
 * Which slot a key makes active in the radial menu. Arrows point: up is the top slot, right the right one, and so on,
 * or the nearest filled slot to that when it's empty. Tab and Shift+Tab go round the filled slots.
 */

import { SLOTS } from './radial-layout.js'

const NONE = -1
const FIRST = 0
const NEXT = 1

const TOP = 0
const RIGHT = 2
const BOTTOM = 4
const LEFT = 6

/**
 * The slot each arrow points at
 * @type {ReadonlyMap<string, number>}
 */
const ARROWS = new Map([
  ['ArrowDown', BOTTOM],
  ['ArrowLeft', LEFT],
  ['ArrowRight', RIGHT],
  ['ArrowUp', TOP],
])

/**
 * The filled slot nearest one, trying clockwise before counter-clockwise at each distance
 * @param {number} target - The slot pointed at
 * @param {number} filled - How many slots are filled, from the top
 * @returns {number} The slot, -1 if none is filled
 */
function nearest(target, filled) {
  for (let distance = FIRST; distance < SLOTS; distance += NEXT) {
    const clockwise = (target + distance) % SLOTS
    const counter = (target - distance + SLOTS) % SLOTS
    if (clockwise < filled) {
      return clockwise
    }
    if (counter < filled) {
      return counter
    }
  }
  return NONE
}

/**
 * The next filled slot round from the active one, or the one before with `back`
 * @param {number} active - The active slot, -1 for none
 * @param {number} filled - How many slots are filled, from the top
 * @param {boolean} back - Whether to go the other way
 * @returns {number} The slot, -1 if none is filled
 */
function round(active, filled, back) {
  if (filled === FIRST) {
    return NONE
  }
  const last = filled - NEXT
  if (back) {
    return active <= FIRST ? last : active - NEXT
  }
  return active === NONE || active >= last ? FIRST : active + NEXT
}

/**
 * The slot a key makes active
 * @param {Readonly<{ key: string, shiftKey: boolean }>} event - The key going down
 * @param {Readonly<{ active: number, filled: number }>} slots - The active slot (-1 for none), and how many are filled
 * @returns {number | undefined} The slot; -1 if the key moves but nothing is filled, undefined if it doesn't move
 */
function slotForKey({ key, shiftKey }, { active, filled }) {
  const target = ARROWS.get(key)
  if (target !== undefined) {
    return nearest(target, filled)
  }
  return key === 'Tab' ? round(active, filled, shiftKey) : undefined
}

export { slotForKey }
