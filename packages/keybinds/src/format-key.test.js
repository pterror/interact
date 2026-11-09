import { describe, expect, test } from 'bun:test'

import { formatKey } from './format-key.js'
import { formatSteps } from './format-steps.js'
import { isMac } from './modifiers.js'

/** A German layout: the key a US layout calls "/" types "-" */
const GERMAN = new Map([
  ['BracketLeft', 'ü'],
  ['Digit1', '1'],
  ['KeyZ', 'y'],
  ['Slash', '-'],
])

describe('formatKey', () => {
  test('shows modifiers, named keys and arrows by their symbols', () => {
    expect(formatKey('ctrl+a')).toEqual([isMac ? '⌃' : 'Ctrl', 'A'])
    expect(formatKey('alt+b')).toEqual([isMac ? '⌥' : 'Alt', 'B'])
    expect(['backspace', 'delete', 'escape', 'enter', 'space', 'tab'].map((key) => formatKey(key))).toEqual([
      ['⌫'],
      ['⌦'],
      ['Esc'],
      ['↵'],
      ['Space'],
      ['Tab'],
    ])
    expect(['arrowup', 'down', 'arrowleft', 'right'].map((key) => formatKey(key))).toEqual([['↑'], ['↓'], ['←'], ['→']])
    expect(formatKey('$mod+k')).toEqual([isMac ? '⌘' : 'Ctrl', 'K'])
  })

  test('shows physical key names as the character they type', () => {
    expect(formatKey('shift+slash').at(-1)).toBe('/')
    expect(formatKey('shift+digit1').at(-1)).toBe('1')
    expect(formatKey('$mod+comma').at(-1)).toBe(',')
    expect(formatKey('$mod+plus').at(-1)).toBe('+')
    expect(formatKey('?')).toEqual(['?'])
  })

  test('shows physical keys as the layout types them, letters as written', () => {
    expect(formatKey('shift+slash', GERMAN).at(-1)).toBe('-')
    expect(formatKey('bracketleft', GERMAN)).toEqual(['Ü'])
    expect(formatKey('z', GERMAN)).toEqual(['Z'])
    expect(formatKey('comma', GERMAN)).toEqual([','])
  })
})

/**
 * One key step as shown, without a layout
 * @param {string} step - The step
 * @returns {readonly string[]} Its parts
 */
function format(step) {
  return formatKey(step)
}

describe('formatSteps', () => {
  test('shows each step, "then" between them, and the suffix last', () => {
    expect(formatSteps('g i', format)).toEqual(['G', 'then', 'I'])
    expect(formatSteps('ctrl + k:UP', format)).toEqual([isMac ? '⌃' : 'Ctrl', 'K', 'Release'])
    expect(formatSteps('k:hold', format)).toEqual(['K', 'Hold'])
    expect(formatSteps('k:tap', format)).toEqual(['K', 'Tap'])
  })
})
