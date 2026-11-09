import { describe, expect, test } from 'bun:test'

import { axes, axesUI, gamepad, gamepadUI, keys, keysUI, mouse, mouseUI } from './index.js'

describe('the package', () => {
  test('gives each input and the half that shows and records it', () => {
    const made = [keys, keysUI, mouse, mouseUI, gamepad, gamepadUI, axes, axesUI]
    expect(made.map((each) => typeof each)).toEqual(Array.from(made, () => 'function'))
  })
})
