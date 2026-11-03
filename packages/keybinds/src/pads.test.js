/** @import { Pad } from './pads.js' */

import { afterEach, describe, expect, test } from 'bun:test'

import { connectedPads, padAxesOf, pressedButtons } from './pads.js'
import { fakePads } from './test-pads.js'

const BUTTON_A = 0
const BUTTON_Y = 3
const BUTTON_RT = 7
const FIRST = 0
const SECOND = 1
const PULLED = 1
const AT_REST = 0

/** @type {(() => void)[]} */
const cleanups = []

afterEach(() => {
  for (const cleanup of cleanups.splice(FIRST)) {
    cleanup()
  }
})

/**
 * Which buttons a pad has down
 * @param {Pad} pad - The pad
 * @returns {number[]} Their indexes
 */
function buttonsDown(pad) {
  /** @type {number[]} */
  const down = []
  for (const [index, pressed] of pressedButtons(pad).entries()) {
    if (pressed) {
      down.push(index)
    }
  }
  return down
}

describe('pads', () => {
  test('are the ones connected, each with its standard buttons down or not', () => {
    const pads = fakePads()
    cleanups.push(pads.restore)
    pads.set([BUTTON_A, BUTTON_Y], [])
    expect(connectedPads().map((pad) => pad.index)).toEqual([FIRST, SECOND])
    expect(connectedPads().map((pad) => buttonsDown(pad))).toEqual([[BUTTON_A, BUTTON_Y], []])
  })

  test('read every stick and trigger, sticks first, as the browser gives them', () => {
    const pads = fakePads()
    cleanups.push(pads.restore)
    pads.set([BUTTON_RT])
    expect(connectedPads().map((pad) => padAxesOf(pad))).toEqual([
      [AT_REST, AT_REST, AT_REST, AT_REST, AT_REST, PULLED],
    ])
  })
})
