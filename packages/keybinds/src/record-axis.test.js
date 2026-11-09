import { afterEach, describe, expect, test } from 'bun:test'

import { pads } from './pads.js'
import { recordAxis } from './record-axis.js'
import { kbd } from './test-keys.js'
import { fakePads } from './test-pads.js'

const BUTTONS = 17
const PUSHED = 0.9
const SOME = 30
const PAST = 90

/** @type {(() => void)[]} */
const cleanups = []

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) {
    cleanup()
  }
})

/**
 * Records an axis binding from the window
 * @param {Parameters<typeof recordAxis>[0]['pads']} [from] - The pads
 * @returns {readonly string[]} What was recorded
 */
function recording(from) {
  /** @type {string[]} */
  const got = []
  cleanups.push(
    recordAxis({
      done: (binding) => {
        got.push(binding)
      },
      ...(from === undefined ? {} : { pads: from }),
    }),
  )
  return got
}

/**
 * A pad with its right stick pushed this far right
 * @param {number} right - How far
 * @returns {Parameters<ReturnType<typeof fakePads>['setPads']>[0][number]} The pad
 */
function pushed(right) {
  return {
    axes: [0, 0, right, 0],
    buttons: Array.from({ length: BUTTONS }, () => ({ pressed: false, value: 0 })),
    index: 0,
  }
}

describe('recordAxis', () => {
  test('takes the mouse once it has moved far enough one way', () => {
    const got = recording()
    globalThis.dispatchEvent(new MouseEvent('mousemove', { movementX: SOME, movementY: SOME }))
    expect(got).toEqual([])
    globalThis.dispatchEvent(new MouseEvent('mousemove', { movementY: PAST }))
    expect(got).toEqual(['mouse:y'])
  })

  test('takes two different keys as a pair, toward -1 then toward 1', () => {
    const got = recording()
    globalThis.dispatchEvent(kbd('keydown', { code: 'KeyJ', key: 'j' }))
    globalThis.dispatchEvent(kbd('keydown', { code: 'KeyJ', key: 'j' }))
    expect(got).toEqual([])
    globalThis.dispatchEvent(kbd('keydown', { code: 'KeyL', key: 'l' }))
    expect(got).toEqual(['keys:j/l'])
  })

  test('takes a stick pushed well past where it rested', () => {
    const faked = fakePads()
    cleanups.push(faked.restore)
    faked.setPads([pushed(0)])
    const got = recording(pads())
    faked.frame()
    faked.setPads([pushed(PUSHED)])
    faked.frame()
    expect(got).toEqual(['pad:rx'])
  })
})
