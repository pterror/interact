import { afterEach, describe, expect, test } from 'bun:test'

import { pads } from './pads.js'
import { recordPad } from './record-pad.js'
import { fakePads } from './test-pads.js'

const BUTTON_A = 0
const BUTTON_Y = 3

/** @type {(() => void)[]} */
const cleanups = []

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) {
    cleanup()
  }
})

/**
 * Records from fake pads, one connected with these buttons down when recording starts
 * @param {boolean} release - Whether to record a release
 * @param {readonly number[]} [down] - The buttons down at the start
 * @returns {Readonly<{ got: readonly string[], faked: ReturnType<typeof fakePads> }>} What was recorded, and the pads
 */
function recording(release, down = []) {
  const faked = fakePads()
  faked.set(down)
  /** @type {string[]} */
  const got = []
  const stop = recordPad({
    done: (binding) => {
      got.push(binding)
    },
    pads: pads(),
    release,
  })
  cleanups.push(stop, faked.restore)
  faked.frame()
  return { faked, got }
}

describe('recordPad', () => {
  test('takes the next button pressed', () => {
    const { faked, got } = recording(false)
    faked.set([BUTTON_Y])
    faked.frame()
    expect(got).toEqual(['y'])
  })

  test('with a release, waits for that button to be let go', () => {
    const { faked, got } = recording(true)
    faked.set([BUTTON_A])
    faked.frame()
    expect(got).toEqual([])
    faked.set([])
    faked.frame()
    expect(got).toEqual(['a:up'])
  })

  test("doesn't count a button already down when recording starts", () => {
    const { faked, got } = recording(false, [BUTTON_A])
    faked.frame()
    expect(got).toEqual([])
  })
})
