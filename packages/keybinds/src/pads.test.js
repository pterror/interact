import { afterEach, describe, expect, test } from 'bun:test'

import { keybinds } from './keybinds.js'
import { pads } from './pads.js'
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
 * Fake pads, put back after the test
 * @returns {ReturnType<typeof fakePads>} The pads
 */
function fake() {
  const faked = fakePads()
  cleanups.push(faked.restore)
  return faked
}

describe('pads', () => {
  test('are the ones connected, each with its buttons', () => {
    fake().set([BUTTON_A, BUTTON_Y], [])
    const read = pads().get()
    expect(read.map((pad) => [pad.index, pad.buttons.filter((button) => button.pressed).length])).toEqual([
      [0, 2],
      [1, 0],
    ])
  })

  test('are read each frame while one is connected and something watches, and no longer', () => {
    const faked = fake()
    const watched = pads()
    let heard = 0
    const stop = watched.watch(() => {
      heard += 1
    })
    expect(faked.frames()).toBe(0)
    faked.set([])
    globalThis.dispatchEvent(new Event('gamepadconnected'))
    faked.frame()
    faked.frame()
    faked.set()
    faked.frame()
    expect([heard, faked.frames()]).toEqual([3, 0])
    faked.set([])
    globalThis.dispatchEvent(new Event('gamepadconnected'))
    stop()
    expect(faked.frames()).toBe(0)
  })

  test("aren't read without a gamepad binding", () => {
    const faked = fake()
    faked.set([])
    cleanups.push(keybinds([{ keys: ['k'], run: () => undefined }]))
    expect(faked.frames()).toBe(0)
  })
})
