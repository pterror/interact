/** @import { Command } from './command.js' */

import { describe, expect, mock, test } from 'bun:test'

import { formatBinding } from './binding-format.js'
import { keybinds } from './core.js'
import { holds } from './holds.js'
import { keysUI } from './keys-ui.js'
import { keys } from './keys.js'
import { mouse } from './mouse.js'
import { accepts, kbd } from './test-helpers.js'

const DELAY = 30
const LONG = 60
const ONCE = 1
const NO_TIME = 0
const MIDDLE = 1
const MIDDLE_HELD = 4

/**
 * Listens with holds on a fresh element
 * @param {readonly Command[]} commands - The commands
 * @returns {Readonly<{ listening: import('./core.js').Keybinds, target: HTMLElement }>} What keybinds() returned,
 *   and the element
 */
function listen(commands) {
  const target = document.createElement('div')
  const listening = keybinds(commands, undefined, {
    holds: holds({ delay: DELAY }),
    inputs: [keys(), mouse()],
    target,
  })
  return { listening, target }
}

/**
 * Holds K down for a while, then lets it go
 * @param {HTMLElement} target - Where the keys are pressed
 * @param {number} milliseconds - How long it's held
 * @returns {Promise<void>} When it has been let go
 */
async function pressFor(target, milliseconds) {
  target.dispatchEvent(kbd('keydown', { code: 'KeyK', key: 'k' }))
  await Bun.sleep(milliseconds)
  target.dispatchEvent(kbd('keyup', { code: 'KeyK', key: 'k' }))
}

describe('holds', () => {
  test('a hold binding fires once the key has been held long enough, and is held until it comes up', async () => {
    const execute = mock(() => undefined)
    const { listening, target } = listen([{ execute, id: 'charge', keys: ['k:hold'], label: 'Charge' }])
    target.dispatchEvent(kbd('keydown', { code: 'KeyK', key: 'k' }))
    expect(execute).not.toHaveBeenCalled()
    await Bun.sleep(LONG)
    expect([execute.mock.calls.length, listening.held('charge')]).toEqual([ONCE, true])
    target.dispatchEvent(kbd('keyup', { code: 'KeyK', key: 'k' }))
    expect(listening.held('charge')).toBe(false)
    listening()
  })

  test('a key let go before then is a tap, not a hold', async () => {
    const hold = mock(() => undefined)
    const tap = mock(() => undefined)
    const { listening, target } = listen([
      { execute: hold, id: 'hold', keys: ['k:hold'], label: 'Hold' },
      { execute: tap, id: 'tap', keys: ['k:tap'], label: 'Tap' },
    ])
    await pressFor(target, NO_TIME)
    await Bun.sleep(LONG)
    expect([hold.mock.calls.length, tap.mock.calls.length]).toEqual([ONCE - ONCE, ONCE])
    await pressFor(target, LONG)
    expect([hold.mock.calls.length, tap.mock.calls.length]).toEqual([ONCE, ONCE])
    listening()
  })
})

describe('holds beyond keys', () => {
  test('mouse buttons can be held too, but scrolling cannot', async () => {
    const execute = mock(() => undefined)
    const { listening, target } = listen([{ execute, id: 'grab', label: 'Grab', mouse: ['middle:hold'] }])
    target.dispatchEvent(new MouseEvent('mousedown', { button: MIDDLE, buttons: MIDDLE_HELD, cancelable: true }))
    await Bun.sleep(LONG)
    expect(execute).toHaveBeenCalledTimes(ONCE)
    listening()
    const scroll = { execute: () => undefined, id: 'z', label: 'Z', mouse: ['scrollup:hold'] }
    expect(() => accepts([scroll], { holds: holds(), inputs: [mouse()] })).toThrow('Scroll has no ":hold"')
  })

  test('holding and tapping need holds()', () => {
    for (const binding of ['k:hold', 'k:tap']) {
      const command = { execute: () => undefined, id: 'k', keys: [binding], label: 'K' }
      expect(() => accepts([command], { inputs: [keys()] })).toThrow('needs holds()')
    }
  })

  test('shown with what it waits for', () => {
    expect(formatBinding(keysUI(), 'k:hold')).toEqual(['K', 'Hold'])
    expect(formatBinding(keysUI(), 'k:tap')).toEqual(['K', 'Tap'])
  })
})
