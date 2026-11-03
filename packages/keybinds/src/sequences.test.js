/** @import { Command } from './command.js' */

import { describe, expect, mock, test } from 'bun:test'

import { formatBinding } from './binding-format.js'
import { keybinds, validateCommands } from './core.js'
import { keysUI } from './keys-ui.js'
import { keys } from './keys.js'
import { sequences } from './sequences.js'
import { kbd } from './test-helpers.js'

const ONCE = 1
const TIMEOUT = 20
const TOO_LONG = 40

/**
 * A key pressed and let go
 * @typedef {(key: string, init?: KeyboardEventInit) => KeyboardEvent} Press
 */

/**
 * Listens with sequences on a fresh element
 * @param {readonly Command[]} commands - The commands
 * @param {Readonly<{ timeout?: number }>} [options] - For sequences()
 * @returns {Readonly<{ press: Press, stop: () => void, target: HTMLElement }>} A way to press keys, how to stop,
 *   and the element
 */
function listen(commands, options) {
  const target = document.createElement('div')
  const stop = keybinds(commands, undefined, { inputs: [keys()], sequences: sequences(options), target })
  /**
   * Presses a key and lets it go
   * @param {string} key - The key
   * @param {KeyboardEventInit} [init] - More of the events
   * @returns {KeyboardEvent} The keydown
   */
  function press(key, init = {}) {
    const code = /^[a-z]$/u.test(key) ? `Key${key.toUpperCase()}` : key
    const down = kbd('keydown', { code, key, ...init })
    target.dispatchEvent(down)
    target.dispatchEvent(kbd('keyup', { code, key, ...init }))
    return down
  }
  return { press, stop, target }
}

/**
 * A command bound to "g i"
 * @param {Partial<Command>} [fields] - More of it
 * @returns {Command} The command
 */
function inbox(fields = {}) {
  return { execute: () => undefined, id: 'inbox', keys: ['g i'], label: 'Inbox', ...fields }
}

describe('sequences', () => {
  test('fire on their last step, and earlier steps are theirs', () => {
    const execute = mock(() => undefined)
    const { press, stop } = listen([inbox({ execute })])
    expect(press('g').defaultPrevented).toBe(true)
    expect(execute).not.toHaveBeenCalled()
    press('i')
    press('i')
    expect(execute).toHaveBeenCalledTimes(ONCE)
    stop()
  })

  test('have steps with modifiers, and a double tap is the same key twice', () => {
    const save = mock(() => undefined)
    const twice = mock(() => undefined)
    const { press, stop } = listen([
      { execute: save, id: 'save-all', keys: ['ctrl+k ctrl+s'], label: 'Save all' },
      { execute: twice, id: 'twice', keys: ['j j'], label: 'Twice' },
    ])
    press('k', { ctrlKey: true })
    press('s', { ctrlKey: true })
    press('j')
    press('j')
    expect([save.mock.calls.length, twice.mock.calls.length]).toEqual([ONCE, ONCE])
    stop()
  })

  test('let a press that does not go on from the steps so far be a press of its own', () => {
    const execute = mock(() => undefined)
    const other = mock(() => undefined)
    const { press, stop } = listen([inbox({ execute }), { execute: other, id: 'x', keys: ['x'], label: 'X' }])
    press('g')
    press('x')
    press('i')
    expect([other.mock.calls.length, execute.mock.calls.length]).toEqual([ONCE, ONCE - ONCE])
    stop()
  })

  test('need the next step within the timeout', async () => {
    const execute = mock(() => undefined)
    const { press, stop } = listen([inbox({ execute })], { timeout: TIMEOUT })
    press('g')
    await Bun.sleep(TOO_LONG)
    press('i')
    expect(execute).not.toHaveBeenCalled()
    stop()
  })
})

describe('sequences with other keys', () => {
  test('carry on through Shift pressed between steps', () => {
    const execute = mock(() => undefined)
    const { press, stop, target } = listen([{ execute, id: 'top', keys: ['g shift+g'], label: 'Top' }])
    press('g')
    target.dispatchEvent(kbd('keydown', { code: 'ShiftLeft', key: 'Shift', shiftKey: true }))
    press('G', { code: 'KeyG', shiftKey: true })
    expect(execute).toHaveBeenCalledTimes(ONCE)
    stop()
  })

  test('do not take their first step while their commands do not apply', () => {
    const { press, stop } = listen([inbox({ when: () => false })])
    expect(press('g').defaultPrevented).toBe(false)
    stop()
  })

  test('cannot start with a step that is a binding of its own, nor be used without sequences()', () => {
    const both = [{ execute: () => undefined, id: 'go', keys: ['g'], label: 'Go' }, inbox()]
    expect(() => validateCommands(both, { inputs: [keys()], sequences: sequences() })).toThrow(
      'both a binding and the start of a sequence',
    )
    expect(() => validateCommands([inbox()], { inputs: [keys()] })).toThrow('needs sequences()')
  })

  test('are shown step by step', () => {
    expect(formatBinding(keysUI(), 'ctrl+k ctrl+s')).toEqual(['Ctrl', 'K', 'then', 'Ctrl', 'S'])
  })
})
