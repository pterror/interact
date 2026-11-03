import { describe, expect, test } from 'bun:test'

import { formatGamepadParts, gamepadUI } from './gamepad-ui.js'
import { fakePads } from './test-pads.js'

describe('formatGamepadParts', () => {
  test('shows each button by its standard name, whatever name the binding used', () => {
    expect(formatGamepadParts('rt')).toEqual(['RT'])
    expect(formatGamepadParts('south:up')).toEqual(['A', 'Release'])
    expect(formatGamepadParts('up')).toEqual(['D-pad ↑'])
  })
})

describe('gamepadUI', () => {
  test('can record while a pad is connected', () => {
    const pads = fakePads()
    pads.set()
    expect(gamepadUI().available?.()).toBe(false)
    pads.set([])
    expect(gamepadUI().available?.()).toBe(true)
    pads.restore()
  })
})
