import { afterEach, describe, expect, mock, test } from 'bun:test'

import { modifierHold } from './modifier-hold.js'
import { modifierTaps } from './modifier-taps.js'
import { kbd } from './test-keys.js'

const SHORT = 20
const LONGER = 40

/** @type {(() => void)[]} */
const cleanups = []

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) {
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
 * Follows Control held on a fresh element
 * @returns {Readonly<{ held: ReturnType<typeof mock<(held: boolean) => void>>, target: HTMLElement }>} What it heard,
 *   and the element
 */
function holding() {
  const target = document.createElement('div')
  const held = mock((/** @type {boolean} */ _held) => undefined)
  cleanups.push(modifierHold({ delay: SHORT, modifiers: ['Control'], target, to: held }))
  return { held, target }
}

describe('modifierHold', () => {
  test('hears it held once long enough, and let go', async () => {
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
    controlUp(target)
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

describe('modifierTaps', () => {
  test('runs once it is tapped twice in quick succession', () => {
    const target = document.createElement('div')
    const run = mock(() => undefined)
    cleanups.push(modifierTaps({ modifiers: ['Control'], run, target }))
    controlDown(target)
    controlUp(target)
    expect(run).not.toHaveBeenCalled()
    controlDown(target)
    controlUp(target)
    expect(run).toHaveBeenCalledTimes(1)
  })

  test('starts over when the window loses focus mid-tap', () => {
    const target = document.createElement('div')
    const run = mock(() => undefined)
    cleanups.push(modifierTaps({ modifiers: ['Control'], run, target }))
    controlDown(target)
    controlUp(target)
    controlDown(target)
    globalThis.dispatchEvent(new Event('blur'))
    controlUp(target)
    expect(run).not.toHaveBeenCalled()
  })
})
