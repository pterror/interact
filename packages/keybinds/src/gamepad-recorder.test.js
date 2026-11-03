/** @import { FakePads } from './test-pads.js' */

import { afterEach, describe, expect, test } from 'bun:test'

import { GamepadRecorder } from './gamepad-recorder.js'
import { fakePads } from './test-pads.js'

const BUTTON_A = 0
const BUTTON_Y = 3
const FIRST = 0

/** @type {(() => void)[]} */
const cleanups = []

afterEach(() => {
  for (const cleanup of cleanups.splice(FIRST)) {
    cleanup()
  }
})

/**
 * Records from fake pads, with one pad connected and these buttons down when recording starts
 * @param {boolean} release - Whether to record a release
 * @param {readonly number[]} [down] - The buttons down at the start
 * @returns {Readonly<{ got: readonly string[], pads: FakePads }>} What was recorded, and the pads
 */
function recordFromPads(release, down = []) {
  const pads = fakePads()
  cleanups.push(pads.restore)
  /** @type {string[]} */
  const got = []
  pads.set(down)
  const recorder = new GamepadRecorder(release, (binding) => {
    got.push(binding)
  })
  cleanups.push(() => {
    recorder.stop()
  })
  pads.frame()
  return { got, pads }
}

describe('recording a gamepad button', () => {
  test('takes the next button pressed', () => {
    const { got, pads } = recordFromPads(false)
    pads.set([BUTTON_Y])
    pads.frame()
    expect(got).toEqual(['y'])
  })

  test('with a release, waits for that button to be let go', () => {
    const { got, pads } = recordFromPads(true)
    pads.set([BUTTON_A])
    pads.frame()
    expect(got).toEqual([])
    pads.set([])
    pads.frame()
    expect(got).toEqual(['a:up'])
  })

  test("doesn't count a button already down when recording starts", () => {
    const { got, pads } = recordFromPads(false, [BUTTON_A])
    pads.frame()
    expect(got).toEqual([])
  })
})
