/**
 * @import { Command } from './command.js'
 */

import { describe, expect, mock, test } from 'bun:test'

import { findConflict } from './binding.js'
import { aliases } from './keys-aliases.js'
import { symbols } from './keys-symbols.js'
import { keys as keysInput } from './keys.js'
import { accepts, kbd, keybinds, mouse, recording } from './test-helpers.js'
import { ALL, INPUT } from './test-inputs.js'

const ONCE = 1
const LEFT = 0
const MIDDLE = 1
const RIGHT = 2

/** @type {readonly (readonly [string, string, string])[]} */
const ALIASES = [
  ['up', 'ArrowUp', 'ArrowUp'],
  ['down', 'ArrowDown', 'ArrowDown'],
  ['left', 'ArrowLeft', 'ArrowLeft'],
  ['right', 'ArrowRight', 'ArrowRight'],
  ['arrowup', 'ArrowUp', 'ArrowUp'],
  ['space', ' ', 'Space'],
  ['escape', 'Escape', 'Escape'],
  ['comma', ',', 'Comma'],
  ['slash', '/', 'Slash'],
  ['bracketleft', '[', 'BracketLeft'],
  ['[', '[', 'BracketLeft'],
  ['pageup', 'PageUp', 'PageUp'],
  ['f5', 'F5', 'F5'],
  ['5', '5', 'Digit5'],
  ['a', 'A', 'KeyA'],
]

/**
 * Whether a binding fires on a key event
 * @param {string} binding - The binding
 * @param {KeyboardEventInit} init - The event
 * @returns {boolean} Whether it fired once
 */
function fires(binding, init) {
  const execute = mock(() => undefined)
  const target = document.createElement('div')
  const stop = keybinds([{ execute, id: 'x', keys: [binding], label: 'X' }], undefined, { target })
  target.dispatchEvent(kbd('keydown', init))
  stop()
  return execute.mock.calls.length === ONCE
}

/**
 * A command with key bindings and nothing to do
 * @param {string} id - Its id
 * @param {readonly string[]} keys - Its bindings
 * @returns {Command} The command
 */
function bound(id, keys) {
  return { execute: () => undefined, id, keys, label: id }
}

describe('key aliases', () => {
  test.each(ALIASES)('"%s" fires on a real key press (%s, %s)', (binding, key, code) => {
    expect(fires(binding, { code, key })).toBe(true)
  })

  test('name the same key as what they stand for, releases too', () => {
    const schema = { save: { keys: ['arrowup'], label: 'Save' } }
    expect(findConflict(schema, { binding: 'up', input: INPUT.keys })?.commandId).toBe('save')
    const up = mock(() => undefined)
    const target = document.createElement('div')
    const stop = keybinds([{ execute: up, id: 'x', keys: ['left:up'], label: 'X' }], undefined, { target })
    target.dispatchEvent(kbd('keydown', { code: 'ArrowLeft', key: 'ArrowLeft' }))
    target.dispatchEvent(kbd('keyup', { code: 'ArrowLeft', key: 'ArrowLeft' }))
    expect(up).toHaveBeenCalledTimes(ONCE)
    stop()
  })

  test('cover modifiers and mouse buttons too', () => {
    const execute = mock(() => undefined)
    const target = document.createElement('div')
    /** @type {readonly Command[]} */
    const commands = [
      { execute, id: 'a', keys: ['control+a'], label: 'A' },
      { execute, id: 'b', keys: ['option+b'], label: 'B' },
      { execute, id: 'c', keys: ['cmd+c'], label: 'C' },
      { execute, id: 'd', keys: ['command+d'], label: 'D' },
      { execute, id: 'l', label: 'L', mouse: ['left'] },
      { execute, id: 'r', label: 'R', mouse: ['rightclick'] },
      { execute, id: 'm', label: 'M', mouse: ['middleclick'] },
    ]
    const stop = keybinds(commands, undefined, { target })
    for (const event of [
      kbd('keydown', { code: 'KeyA', ctrlKey: true, key: 'a' }),
      kbd('keydown', { altKey: true, code: 'KeyB', key: 'b' }),
      kbd('keydown', { code: 'KeyC', key: 'c', metaKey: true }),
      kbd('keydown', { code: 'KeyD', key: 'd', metaKey: true }),
      mouse('mousedown', LEFT),
      mouse('mousedown', RIGHT),
      mouse('mousedown', MIDDLE),
    ]) {
      target.dispatchEvent(event)
    }
    expect(execute).toHaveBeenCalledTimes(commands.length)
    stop()
  })
})

describe('typed characters and shifted keys', () => {
  test('a character binds however it is typed: "?" fires on Shift+/', () => {
    expect(fires('?', { code: 'Slash', key: '?', shiftKey: true })).toBe(true)
    expect(fires('!', { code: 'Digit1', key: '!', shiftKey: true })).toBe(true)
    expect(fires('$mod+?', { code: 'Slash', ctrlKey: true, key: '?', shiftKey: true })).toBe(true)
  })

  test('"shift+/" and "shift+1" mean the physical keys, so they fire', () => {
    expect(fires('shift+/', { code: 'Slash', key: '?', shiftKey: true })).toBe(true)
    expect(fires('shift+1', { code: 'Digit1', key: '!', shiftKey: true })).toBe(true)
  })

  test('"plus" is the + key', () => {
    expect(fires('$mod+plus', { code: 'Equal', ctrlKey: true, key: '+', shiftKey: true })).toBe(true)
  })

  test('Shift still tells letters apart', () => {
    expect(fires('a', { code: 'KeyA', key: 'A', shiftKey: true })).toBe(false)
    expect(fires('shift+a', { code: 'KeyA', key: 'A', shiftKey: true })).toBe(true)
  })
})

describe('key binding errors', () => {
  test('name an unknown key as it was typed', () => {
    expect(() => accepts([bound('x', ['nope'])], ALL)).toThrow('Unknown key "nope"')
  })

  test('name the module that syntax nobody added needs', () => {
    const keysOnly = { inputs: [keysInput()] }
    expect(() => accepts([bound('q', ['?'])], keysOnly)).toThrow('Unknown key "?"')
    expect(() => accepts([bound('u', ['up'])], keysOnly)).toThrow('Unknown key "up"')
    expect(() => accepts([bound('k', ['k:up'])], keysOnly)).toThrow('needs releases()')
    expect(() => accepts([{ ...bound('w', ['w']), anyModifiers: true }], keysOnly)).toThrow('needs anyModifiers()')
    const withSyntax = { inputs: [keysInput(symbols(), aliases())] }
    expect(accepts([bound('q', ['?', 'up', 'shift+slash'])], withSyntax)).toBe(true)
  })
})

describe('keys whose release never arrives', () => {
  test('are released when the window loses focus, and the real keyup later has nothing left to release', () => {
    const fired = recording()
    const target = document.createElement('div')
    const stop = keybinds([{ execute: fired.execute, id: 'k', keys: ['k', 'k:up'], label: 'K' }], undefined, {
      target,
    })
    target.dispatchEvent(kbd('keydown', { code: 'KeyK', key: 'k' }))
    target.ownerDocument.defaultView?.dispatchEvent(new Event('blur'))
    expect(fired.types).toEqual(['keydown', 'keyup'])
    target.dispatchEvent(kbd('keyup', { code: 'KeyK', key: 'k' }))
    expect(fired.types).toEqual(['keydown', 'keyup'])
    stop()
  })
})
