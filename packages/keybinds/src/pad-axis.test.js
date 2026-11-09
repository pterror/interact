import { afterEach, describe, expect, test } from 'bun:test'

import { keybinds } from './keybinds.js'
import { fakePads } from './test-pads.js'

const BUTTONS = 17
const RT = 7
const HALF = 0.5
const DRIFT = 0.1
const DEADZONE = 0.15

/** @type {(() => void)[]} */
const cleanups = []

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) {
    cleanup()
  }
})

describe('sticks and triggers', () => {
  test('ignore a stick drifting, read its tilt past that, and read a trigger pull, summed over pads', () => {
    const faked = fakePads()
    cleanups.push(faked.restore)
    const buttons = Array.from({ length: BUTTONS }, (_unused, index) => ({
      pressed: false,
      value: index === RT ? HALF : 0,
    }))
    faked.setPads([
      { axes: [DRIFT, 0, 1, -HALF], buttons, index: 0 },
      { axes: [], buttons, index: 1 },
    ])
    const drift = { axes: ['pad:lx'] }
    const turn = { axes: ['pad:rx'] }
    const tilt = { axes: ['-pad:ry'] }
    const gas = { axes: ['pad:rt'] }
    const kb = keybinds([drift, turn, tilt, gas])
    cleanups.push(kb)
    expect([kb.axis(drift).position, kb.axis(turn).position]).toEqual([0, 1])
    expect(kb.axis(tilt).position).toBeCloseTo((HALF - DEADZONE) / (1 - DEADZONE))
    expect(kb.axis(gas).position).toBe(1)
  })
})
