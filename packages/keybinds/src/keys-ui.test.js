import { describe, expect, test } from 'bun:test'

import { aliases } from './keys-aliases.js'
import { symbols } from './keys-symbols.js'
import { eventToBindingString, formatKeyParts } from './keys-ui.js'
import { kbd } from './test-helpers.js'

const LAST = -1

describe('formatKeyParts', () => {
  test('shows modifiers, named keys and arrows by their symbols', () => {
    expect(formatKeyParts('ctrl+a')).toEqual(['Ctrl', 'A'])
    expect(formatKeyParts('alt+b')).toEqual(['Alt', 'B'])
    expect(formatKeyParts('shift+c')).toEqual(['Shift', 'C'])
    expect(['backspace', 'delete', 'escape', 'enter', 'space', 'tab'].map((key) => formatKeyParts(key))).toEqual([
      ['⌫'],
      ['⌦'],
      ['Esc'],
      ['↵'],
      ['Space'],
      ['Tab'],
    ])
    expect(['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].map((key) => formatKeyParts(key))).toEqual([
      ['↑'],
      ['↓'],
      ['←'],
      ['→'],
    ])
  })

  test('shows $mod as Ctrl away from a Mac', () => {
    expect(formatKeyParts('$mod+k')).toEqual(['Ctrl', 'K'])
  })

  test('shows physical key names as the character they type', () => {
    expect(formatKeyParts('shift+slash')).toEqual(['Shift', '/'])
    expect(formatKeyParts('shift+digit1')).toEqual(['Shift', '1'])
    expect(formatKeyParts('$mod+comma').at(LAST)).toBe(',')
    expect(formatKeyParts('$mod+plus').at(LAST)).toBe('+')
    expect(formatKeyParts('?')).toEqual(['?'])
  })

  test('adds a Release part to a release', () => {
    expect(formatKeyParts('ctrl+k:up')).toEqual(['Ctrl', 'K', 'Release'])
  })
})

describe('eventToBindingString', () => {
  test('writes a key with its modifiers, $mod for Ctrl away from a Mac', () => {
    expect(eventToBindingString(kbd('keydown', { code: 'KeyK', key: 'k' }))).toBe('k')
    expect(eventToBindingString(kbd('keydown', { code: 'KeyK', ctrlKey: true, key: 'k', shiftKey: true }))).toBe(
      '$mod+shift+k',
    )
    expect(eventToBindingString(kbd('keydown', { code: 'KeyS', ctrlKey: true, key: 's' }))).toBe('$mod+s')
  })

  test('gives nothing for a modifier pressed alone, or a key that cannot be bound', () => {
    /** @type {readonly KeyboardEventInit[]} */
    const modifiers = [
      { code: 'ShiftLeft', key: 'Shift' },
      { code: 'ControlLeft', key: 'Control' },
      { code: 'AltLeft', key: 'Alt' },
      { code: 'MetaLeft', key: 'Meta' },
      { code: 'Unidentified', key: 'Unidentified' },
    ]
    expect(modifiers.map((init) => eventToBindingString(kbd('keydown', init)))).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    ])
  })

  test('writes a letter key typing something no binding names as the key (Option+A types "å" on a Mac)', () => {
    expect(eventToBindingString(kbd('keydown', { altKey: true, code: 'KeyA', key: 'å' }))).toBe('alt+a')
  })

  test('writes a release for a keyup', () => {
    expect(eventToBindingString(kbd('keyup', { code: 'KeyK', ctrlKey: true, key: 'k' }))).toBe('$mod+k:up')
    expect(eventToBindingString(kbd('keydown', { code: 'KeyK', key: 'k' }))).toBe('k')
  })
})

describe('eventToBindingString with typed characters', () => {
  test('keeps a shifted symbol as the character typed, not Shift, with symbols()', () => {
    const syntax = [symbols(), aliases()]
    expect(eventToBindingString(kbd('keydown', { code: 'Slash', key: '?', shiftKey: true }), syntax)).toBe('?')
    expect(
      eventToBindingString(kbd('keydown', { code: 'Equal', ctrlKey: true, key: '+', shiftKey: true }), syntax),
    ).toBe('$mod+plus')
    expect(eventToBindingString(kbd('keydown', { code: 'Digit1', key: '1', shiftKey: false }), syntax)).toBe('1')
  })

  test('writes a typed character as the physical key without symbols(), and "+" without aliases() too', () => {
    expect(eventToBindingString(kbd('keydown', { code: 'Slash', key: '?', shiftKey: true }))).toBe('shift+slash')
    expect(eventToBindingString(kbd('keydown', { code: 'Equal', ctrlKey: true, key: '+', shiftKey: true }))).toBe(
      '$mod+shift+equal',
    )
    expect(eventToBindingString(kbd('keydown', { code: 'Equal', key: '+', shiftKey: true }), [symbols()])).toBe(
      'shift+equal',
    )
  })
})
