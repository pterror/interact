/** @import { Command } from './command.js' */

import { describe, expect, mock, test } from 'bun:test'

import { keybinds as listen, validateCommands } from './core.js'
import { keys as keysInput } from './keys.js'
import { kbd, keybinds, mouse } from './test-helpers.js'
import { ALL } from './test-inputs.js'

const ONCE = 1
const MIDDLE = 1

/**
 * A command with nothing to do
 * @param {Partial<Command>} fields - Its fields
 * @returns {Command} The command
 */
function command(fields) {
  return { execute: () => undefined, id: 'x', label: 'X', ...fields }
}

describe('validateCommands', () => {
  test('passes commands whose bindings are all valid', () => {
    expect(validateCommands([command({ id: 'save', keys: ['$mod+s'] }), command({ mouse: ['Click'] })], ALL)).toBe(true)
  })

  test('throws for a command without an id, which a caller without types can give', () => {
    const nameless = command({})
    Reflect.deleteProperty(nameless, 'id')
    expect(() => validateCommands([nameless], ALL)).toThrow('Command missing id')
  })

  test('throws for a binding to an unknown key, to modifiers only, or to several keys', () => {
    expect(() => validateCommands([command({ keys: ['$mod+banana'] })], ALL)).toThrow('Unknown key "banana"')
    expect(() => validateCommands([command({ keys: ['$mod'] })], ALL)).toThrow('no key (only modifiers)')
    expect(() => validateCommands([command({ keys: ['a+b'] })], ALL)).toThrow('multiple keys')
  })

  test('throws for an unknown mouse button', () => {
    expect(() => validateCommands([command({ mouse: ['DoubleClick'] })], ALL)).toThrow('Unknown mouse button')
  })
})

describe('keybinds', () => {
  test('listens only through the inputs it is given, and a binding none of them reads is an error', () => {
    const target = document.createElement('div')
    expect(() =>
      listen([command({ gamepad: ['a'], id: 'jump' })], undefined, { inputs: [keysInput()], target }),
    ).toThrow('Command "jump" has gamepad bindings, but no input reads gamepad')
    expect(() => listen([], undefined, { axes: [{ axes: ['mouse:x'], id: 'x', label: 'X' }], target })).toThrow(
      'no input reads them',
    )
    const execute = mock(() => undefined)
    const stop = listen([command({ execute, keys: ['s'] })], undefined, { inputs: [keysInput()], target })
    target.dispatchEvent(kbd('keydown', { code: 'KeyS', key: 's' }))
    expect(execute).toHaveBeenCalledTimes(ONCE)
    stop()
  })

  test('runs the command bound to a key, and only that one', () => {
    const execute = mock(() => undefined)
    const target = document.createElement('div')
    const stop = keybinds([command({ execute, keys: ['ctrl+s'] })], undefined, { target })
    target.dispatchEvent(kbd('keydown', { code: 'KeyA', ctrlKey: true, key: 'a' }))
    expect(execute).not.toHaveBeenCalled()
    target.dispatchEvent(kbd('keydown', { code: 'KeyS', ctrlKey: true, key: 's' }))
    expect(execute).toHaveBeenCalledTimes(ONCE)
    stop()
  })

  test('runs the command bound to a mouse button', () => {
    const execute = mock(() => undefined)
    const target = document.createElement('div')
    const stop = keybinds([command({ execute, mouse: ['MiddleClick'] })], undefined, { target })
    target.dispatchEvent(mouse('mousedown', MIDDLE))
    expect(execute).toHaveBeenCalledTimes(ONCE)
    stop()
  })
})

describe('keybinds, running and stopping', () => {
  test('skips commands that do not apply', () => {
    const execute = mock(() => undefined)
    const target = document.createElement('div')
    const stop = keybinds([command({ execute, keys: ['ctrl+x'], when: () => false })], undefined, { target })
    target.dispatchEvent(kbd('keydown', { code: 'KeyX', ctrlKey: true, key: 'x' }))
    expect(execute).not.toHaveBeenCalled()
    stop()
  })

  test('stops listening when told', () => {
    const execute = mock(() => undefined)
    const target = document.createElement('div')
    const stop = keybinds([command({ execute, keys: ['ctrl+s'] })], undefined, { target })
    stop()
    target.dispatchEvent(kbd('keydown', { code: 'KeyS', ctrlKey: true, key: 's' }))
    expect(execute).not.toHaveBeenCalled()
  })

  test('tells onExecute which command took an event', () => {
    /** @type {string[]} */
    const ran = []
    /**
     * Notes each command that took an event
     * @param {Command} each - The command
     * @returns {void}
     */
    function onExecute(each) {
      ran.push(each.id)
    }
    const target = document.createElement('div')
    const stop = keybinds([command({ id: 'save', keys: ['ctrl+s'] })], undefined, { onExecute, target })
    target.dispatchEvent(kbd('keydown', { code: 'KeyS', ctrlKey: true, key: 's' }))
    expect(ran).toEqual(['save'])
    stop()
  })
})

describe('keybinds and the context', () => {
  test('gives `when` and the command the context', () => {
    /** @type {unknown[]} */
    const seen = []
    const target = document.createElement('div')
    const ready = command({
      execute: (context) => {
        seen.push(context)
      },
      keys: ['ctrl+x'],
      when: (ctx) => ctx['ready'] === true,
    })
    const stop = keybinds([ready], () => ({ ready: true }), { target })
    target.dispatchEvent(kbd('keydown', { code: 'KeyX', ctrlKey: true, key: 'x' }))
    expect(seen).toEqual([{ ready: true }])
    stop()
  })
})
