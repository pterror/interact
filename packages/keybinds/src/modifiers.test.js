/** @import { Mock } from 'bun:test' */

import { afterEach, describe, expect, mock, test } from 'bun:test'

import { onModifierHold, onModifierTaps } from './modifiers.js'
import { kbd } from './test-helpers.js'

const SHORT = 20
const LONGER = 40
const FIRST = 0
const ONCE = 1
const TWICE = 2

/** @type {(() => void)[]} */
const cleanups = []

afterEach(() => {
  for (const cleanup of cleanups.splice(FIRST)) {
    cleanup()
  }
})

/**
 * Control going down on a target
 * @param {EventTarget} target - Where
 * @param {KeyboardEventInit} [init] - More of the event
 * @returns {void}
 */
function controlDown(target, init = {}) {
  target.dispatchEvent(kbd('keydown', { code: 'ControlLeft', ctrlKey: true, key: 'Control', ...init }))
}

/**
 * Control coming up on a target
 * @param {EventTarget} target - Where
 * @returns {void}
 */
function controlUp(target) {
  target.dispatchEvent(kbd('keyup', { code: 'ControlLeft', key: 'Control' }))
}

/**
 * Follows Control being held on a target of its own
 * @returns {Readonly<{ held: Mock<(held: boolean) => undefined>, target: HTMLElement }>} What it heard, and the target
 */
function holding() {
  const target = document.createElement('div')
  /** @type {Mock<(held: boolean) => undefined>} */
  const held = mock(() => undefined)
  cleanups.push(onModifierHold('Control', held, { delay: SHORT, target }))
  return { held, target }
}

describe('holding a modifier on its own', () => {
  test('calls back once held long enough, and again when let go', async () => {
    const { held, target } = holding()
    controlDown(target)
    await Bun.sleep(LONGER)
    expect(held.mock.calls).toEqual([[true]])
    controlUp(target)
    expect(held.mock.calls).toEqual([[true], [false]])
  })

  test("doesn't count when another key or a click comes first", async () => {
    const { held, target } = holding()
    controlDown(target)
    target.dispatchEvent(kbd('keydown', { code: 'KeyK', ctrlKey: true, key: 'k' }))
    await Bun.sleep(LONGER)
    controlDown(target)
    target.dispatchEvent(new MouseEvent('pointerdown'))
    await Bun.sleep(LONGER)
    expect(held).not.toHaveBeenCalled()
  })

  test("doesn't count as part of a chord with another modifier already down", async () => {
    const { held, target } = holding()
    controlDown(target, { shiftKey: true })
    await Bun.sleep(LONGER)
    expect(held).not.toHaveBeenCalled()
  })
})

describe('tapping a modifier', () => {
  test('twice in quick succession calls back once', () => {
    const target = document.createElement('div')
    const tapped = mock(() => undefined)
    cleanups.push(onModifierTaps('Control', tapped, { count: TWICE, target }))
    controlDown(target)
    controlUp(target)
    expect(tapped).not.toHaveBeenCalled()
    controlDown(target)
    controlUp(target)
    expect(tapped).toHaveBeenCalledTimes(ONCE)
  })

  test('starts over when the window loses focus mid-tap', () => {
    const target = document.createElement('div')
    const tapped = mock(() => undefined)
    cleanups.push(onModifierTaps('Control', tapped, { count: TWICE, target }))
    controlDown(target)
    controlUp(target)
    controlDown(target)
    target.ownerDocument.defaultView?.dispatchEvent(new Event('blur'))
    controlUp(target)
    expect(tapped).not.toHaveBeenCalled()
  })
})
