/**
 * @import { AxisDef, AxisValue } from './command.js'
 * @import { Pad } from './pads.js'
 */

import { afterEach, describe, expect, test } from 'bun:test'

import { kbd, keybinds } from './test-helpers.js'
import { fakePads } from './test-pads.js'

const BUTTONS = 17
const RT = 7
const HALF = 0.5
const DRIFT = 0.1
const FULL_RIGHT = 1
const HALF_UP = -0.5
const DEADZONE = 0.15
const TILT = (HALF - DEADZONE) / (FULL_RIGHT - DEADZONE)
const LEFT = -1
const RIGHT = 1
const STILL = 0
const FIRST = 0
const LOOK_RIGHT = 5
const LOOK_RIGHT_MORE = 3
const LOOK_DOWN = 2
const LOOK_DOWN_MORE = 1
const LOOKED_RIGHT = 8
const PITCHED_UP = -3

/** @type {(() => void)[]} */
const cleanups = []

afterEach(() => {
  for (const cleanup of cleanups.splice(FIRST)) {
    cleanup()
  }
})

/**
 * Listens for axes on a target of its own
 * @param {readonly AxisDef[]} axisDefs - The axes
 * @returns {Readonly<{ axis: (id: string) => AxisValue, target: HTMLElement }>} How to read
 *   them, and the target
 */
function listenFor(axisDefs) {
  const target = document.createElement('div')
  const listening = keybinds([], undefined, { axes: axisDefs, target })
  cleanups.push(listening)
  return { axis: listening.axis, target }
}

/**
 * A pad with its sticks where given and its right trigger pulled this far
 * @param {readonly number[]} sticks - The sticks, in the order of `Gamepad.axes`
 * @param {number} rightTrigger - How far the right trigger is pulled
 * @returns {Pad} The pad
 */
function padWith(sticks, rightTrigger) {
  const buttons = Array.from({ length: BUTTONS }, () => ({ pressed: false, value: STILL }))
  buttons[RT] = { pressed: false, value: rightTrigger }
  return { axes: sticks, buttons, index: STILL }
}

describe('key pairs', () => {
  test('give a position from -1 to 1, and losing focus lets go of them', () => {
    const { axis, target } = listenFor([{ axes: ['keys:a/d'], id: 'strafe', label: 'Strafe' }])
    expect(axis('strafe')).toEqual({ delta: STILL, position: STILL })
    target.dispatchEvent(kbd('keydown', { code: 'KeyD', key: 'd' }))
    expect(axis('strafe').position).toBe(RIGHT)
    target.dispatchEvent(kbd('keydown', { code: 'KeyA', key: 'a', shiftKey: true }))
    expect(axis('strafe').position).toBe(STILL)
    target.dispatchEvent(kbd('keyup', { code: 'KeyD', key: 'd' }))
    expect(axis('strafe').position).toBe(LEFT)
    target.ownerDocument.defaultView?.dispatchEvent(new Event('blur'))
    expect(axis('strafe').position).toBe(STILL)
  })
})

describe('mouse movement', () => {
  test('is a delta since each axis was last read', () => {
    const { axis, target } = listenFor([
      { axes: ['mouse:x'], id: 'look', label: 'Look' },
      { axes: ['-mouse:y'], id: 'pitch', label: 'Pitch' },
    ])
    target.dispatchEvent(new MouseEvent('mousemove', { movementX: LOOK_RIGHT, movementY: LOOK_DOWN }))
    target.dispatchEvent(new MouseEvent('mousemove', { movementX: LOOK_RIGHT_MORE, movementY: LOOK_DOWN_MORE }))
    expect(axis('look')).toEqual({ delta: LOOKED_RIGHT, position: STILL })
    expect(axis('look').delta).toBe(STILL)
    expect(axis('pitch').delta).toBe(PITCHED_UP)
  })

  test("isn't kept for an axis whose when is false", () => {
    let on = false
    const { axis, target } = listenFor([{ axes: ['mouse:x'], id: 'look', label: 'Look', when: () => on }])
    target.dispatchEvent(new MouseEvent('mousemove', { movementX: LOOK_RIGHT }))
    expect(axis('look').delta).toBe(STILL)
    on = true
    expect(axis('look').delta).toBe(STILL)
  })
})

describe('sticks and triggers', () => {
  test('sticks ignore drift and triggers read their pull', () => {
    const pads = fakePads()
    cleanups.push(pads.restore)
    pads.setPads([padWith([DRIFT, STILL, FULL_RIGHT, HALF_UP], HALF)])
    const { axis } = listenFor([
      { axes: ['pad:lx'], id: 'drift', label: 'Drift' },
      { axes: ['pad:rx'], id: 'turn', label: 'Turn' },
      { axes: ['-pad:ry'], id: 'tilt', label: 'Tilt' },
      { axes: ['pad:rt'], id: 'gas', label: 'Gas' },
    ])
    expect([axis('drift').position, axis('turn').position]).toEqual([STILL, FULL_RIGHT])
    expect(axis('tilt').position).toBeCloseTo(TILT)
    expect(axis('gas').position).toBeCloseTo(HALF)
  })
})
