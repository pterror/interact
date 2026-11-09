import { describe, expect, test } from 'bun:test'

import {
  eventModifierParts,
  eventModifiers,
  formatModifier,
  isMac,
  modifierPrefix,
  noModifiers,
  parseModifiers,
} from './modifiers.js'

describe('modifiers', () => {
  test('are parsed from a binding by any of their names, `$mod` the platform own', () => {
    expect(parseModifiers(['$mod', 'option', 'k'])).toEqual({
      mods: { ...noModifiers, alt: true, ctrl: !isMac, meta: isMac },
      rest: ['k'],
    })
  })

  test('start a lookup in one order, whatever order they were written in', () => {
    expect(modifierPrefix({ alt: true, ctrl: true, meta: true, shift: true })).toBe('ctrl+alt+shift+meta+')
    expect(modifierPrefix(noModifiers)).toBe('')
  })

  test('are read from an event, and written as a binding writes them', () => {
    const event = new KeyboardEvent('keydown', { altKey: true, ctrlKey: true, key: 'k', shiftKey: true })
    expect(eventModifiers(event)).toEqual({ alt: true, ctrl: true, meta: false, shift: true })
    expect(eventModifierParts(event)).toEqual([isMac ? 'ctrl' : '$mod', 'alt', 'shift'])
    expect(eventModifierParts(event, false)).toEqual([isMac ? 'ctrl' : '$mod', 'alt'])
  })

  test('are shown as the platform shows them', () => {
    expect([formatModifier('$mod'), formatModifier('meta'), formatModifier('k')]).toEqual([
      isMac ? '⌘' : 'Ctrl',
      '⌘',
      undefined,
    ])
  })
})
