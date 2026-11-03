/** @import { Pad } from './pads.js' */

import { afterEach, describe, expect, test } from 'bun:test'

import { AxesRecorder } from './axes-recorder.js'
import { kbd } from './test-helpers.js'
import { fakePads } from './test-pads.js'

const BUTTONS = 17
const AT_REST = 0
const FIRST = 0
const PUSHED = 0.9
const SOME = 30
const PAST = 90

/** @type {(() => void)[]} */
const cleanups = []

afterEach(() => {
  for (const cleanup of cleanups.splice(FIRST)) {
    cleanup()
  }
})

/**
 * Records an axis source from what happens in the window
 * @returns {Readonly<{ got: readonly string[], target: Window }>} What was recorded, and the window
 */
function recordOn() {
  /** @type {string[]} */
  const got = []
  const target = globalThis.window
  const recorder = new AxesRecorder(target, [], (binding) => {
    got.push(binding)
  })
  cleanups.push(() => {
    recorder.stop()
  })
  return { got, target }
}

/**
 * A pad with its right stick pushed this far right
 * @param {number} right - How far
 * @returns {Pad} The pad
 */
function padPushed(right) {
  return {
    axes: [AT_REST, AT_REST, right, AT_REST],
    buttons: Array.from({ length: BUTTONS }, () => ({ pressed: false, value: AT_REST })),
    index: AT_REST,
  }
}

describe('recording an axis source', () => {
  test('takes the mouse once it has moved far enough one way', () => {
    const { got, target } = recordOn()
    target.dispatchEvent(new MouseEvent('mousemove', { movementX: SOME, movementY: SOME }))
    expect(got).toEqual([])
    target.dispatchEvent(new MouseEvent('mousemove', { movementY: PAST }))
    expect(got).toEqual(['mouse:y'])
  })

  test('takes two different keys as a pair, toward -1 then toward 1', () => {
    const { got, target } = recordOn()
    target.dispatchEvent(kbd('keydown', { code: 'KeyJ', key: 'j' }))
    target.dispatchEvent(kbd('keydown', { code: 'KeyJ', key: 'j' }))
    expect(got).toEqual([])
    target.dispatchEvent(kbd('keydown', { code: 'KeyL', key: 'l' }))
    expect(got).toEqual(['keys:j/l'])
  })

  test('takes a stick pushed well past where it rested', () => {
    const pads = fakePads()
    cleanups.push(pads.restore)
    pads.setPads([padPushed(AT_REST)])
    const { got } = recordOn()
    pads.frame()
    pads.setPads([padPushed(PUSHED)])
    pads.frame()
    expect(got).toEqual(['pad:rx'])
  })
})
