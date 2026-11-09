import { describe, expect, mock, test } from 'bun:test'

import { aliases } from './aliases.js'
import { keyParse, keyQuery } from './key-parse.js'
import { symbols } from './symbols.js'
import { listening } from './test-keys.js'

const SYNTAX = [symbols(), aliases()]

/** @type {readonly (readonly [string, string, string])[]} */
const NAMES = [
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
 * Whether a binding runs on a key event, with symbols() and aliases()
 * @param {string} binding - The binding
 * @param {KeyboardEventInit} init - The event
 * @returns {boolean} Whether it ran once
 */
function fires(binding, init) {
  const run = mock(() => undefined)
  const keys = listening([{ keys: [binding], run }], { syntax: SYNTAX })
  keys.target.dispatchEvent(new KeyboardEvent('keydown', { cancelable: true, ...init }))
  keys.stop()
  return run.mock.calls.length === 1
}

describe('key names', () => {
  test.each(NAMES)('"%s" fires on a real key press (%s, %s)', (binding, key, code) => {
    expect(fires(binding, { code, key })).toBe(true)
  })

  test('name the same key as what they stand for, and modifiers have other names too', () => {
    expect(keyParse('up', SYNTAX).lookup).toBe(keyParse('arrowup').lookup)
    expect(keyParse('Control+A').lookup).toBe('ctrl+a')
    expect(keyParse('option+b').lookup).toBe('alt+b')
    expect([keyParse('cmd+c').lookup, keyParse('command+c').lookup]).toEqual(['meta+c', 'meta+c'])
    expect(keyParse('shift + ctrl + k')).toEqual({
      bare: 'k',
      lookup: 'ctrl+shift+k',
      mods: { alt: false, ctrl: true, meta: false, shift: true },
    })
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

  test('a key event is looked up by its key, its physical key and its letter, best first', () => {
    const event = new KeyboardEvent('keydown', { code: 'KeyQ', ctrlKey: true, key: 'a' })
    expect(keyQuery(event)).toEqual({
      bare: ['a', 'keyq', 'q'],
      exact: ['ctrl+a', 'ctrl+keyq', 'ctrl+q'],
      mods: { alt: false, ctrl: true, meta: false, shift: false },
    })
  })
})

describe('key binding errors', () => {
  test('name an unknown key as it was written', () => {
    expect(() => keyParse('$mod+banana', SYNTAX)).toThrow('Unknown key "banana"')
    expect(() => keyParse('$mod')).toThrow('no key (only modifiers)')
    expect(() => keyParse('a+b')).toThrow('multiple keys')
    expect(() => keyParse('')).toThrow('Invalid key binding')
  })

  test('name the piece of syntax a key needs', () => {
    expect(() => keyParse('?')).toThrow('Unknown key "?" in binding "?" (needs symbols())')
    expect(() => keyParse('up')).toThrow('Unknown key "up" in binding "up" (needs aliases())')
    expect(() => keyParse('plus', [aliases()])).toThrow('(needs symbols())')
    expect(() => keyParse('printed')).toThrow('(needs printed())')
    expect(keyParse('shift+slash').lookup).toBe('shift+slash')
  })
})
