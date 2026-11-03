/** @import { Command } from './command.js' */

import { describe, expect, test } from 'bun:test'

import { findConflict } from './binding.js'
import { validateCommands } from './core.js'
import { mouseMatches, parseMouse } from './mouse.js'
import { mouse } from './test-helpers.js'
import { ALL, INPUT } from './test-inputs.js'

const LEFT = 0
const MIDDLE = 1
const BACK = 3

/**
 * A command bound to mouse bindings, doing nothing
 * @param {readonly string[]} bindings - Its mouse bindings
 * @param {boolean} [anyModifiers] - Whether they match whatever else is held
 * @returns {Command} The command
 */
function bound(bindings, anyModifiers = false) {
  return { anyModifiers, execute: () => false, id: 'c', label: 'C', mouse: bindings }
}

describe('parseMouse', () => {
  test('reads every name for a button as one button', () => {
    expect(parseMouse('LeftClick').button).toBe('click')
    expect(parseMouse('ctrl+BackClick')).toEqual({
      button: 'back',
      mods: { alt: false, ctrl: true, meta: false, shift: false },
    })
    expect(() =>
      validateCommands(
        [{ execute: () => false, id: 'x', label: 'X', mouse: ['Back', 'forward', 'ctrl+BackClick'] }],
        ALL,
      ),
    ).not.toThrow()
  })

  test('rejects what names no button, and a scroll with a suffix', () => {
    expect(() => parseMouse('ctrl')).toThrow('no button')
    expect(() => parseMouse('click+right')).toThrow('multiple buttons')
    expect(() => parseMouse('wheel')).toThrow('Unknown mouse button')
    expect(() => parseMouse('scrollup', ':up')).toThrow('Scroll has no ":up"')
  })

  test('finds conflicts between names for the same button only', () => {
    const schema = { history: { label: 'History', mouse: ['back'] } }
    expect(findConflict(schema, { binding: 'BackClick', input: INPUT.mouse })?.commandId).toBe('history')
    expect(findConflict(schema, { binding: 'scrollup', input: INPUT.mouse })).toBeUndefined()
    expect(findConflict(schema, { binding: 'forward', input: INPUT.mouse })).toBeUndefined()
  })
})

describe('mouseMatches', () => {
  test('is a press of a bound button with exactly its modifiers', () => {
    expect(mouseMatches(bound(['MiddleClick']), mouse('mousedown', MIDDLE))).toBe(true)
    expect(mouseMatches(bound(['MiddleClick']), mouse('mousedown', MIDDLE, { shiftKey: true }))).toBe(false)
    expect(mouseMatches(bound(['shift+Back']), mouse('mousedown', BACK, { shiftKey: true }))).toBe(true)
    expect(mouseMatches(bound(['MiddleClick']), mouse('mousedown', LEFT))).toBe(false)
  })

  test('leaves out releases and other modifiers only for anyModifiers commands', () => {
    expect(mouseMatches(bound(['MiddleClick:up']), mouse('mousedown', MIDDLE))).toBe(false)
    expect(mouseMatches(bound(['MiddleClick'], true), mouse('mousedown', MIDDLE, { shiftKey: true }))).toBe(true)
    expect(mouseMatches(bound(['alt+MiddleClick'], true), mouse('mousedown', MIDDLE, { shiftKey: true }))).toBe(false)
  })
})
