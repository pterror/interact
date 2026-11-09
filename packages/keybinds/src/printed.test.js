import { describe, expect, test } from 'bun:test'

import { keyParse, keyQuery } from './key-parse.js'
import { printed } from './printed.js'
import { symbols } from './symbols.js'
import { listening } from './test-keys.js'

/**
 * A key event's lookups with printed() and symbols()
 * @param {KeyboardEventInit} init - The event
 * @returns {readonly string[]} Its lookups
 */
function lookups(init) {
  return keyQuery(new KeyboardEvent('keydown', init), [printed(), symbols()]).exact
}

/**
 * The character a key event typed
 * @param {Event} event - The event
 * @returns {string} Its key
 */
function typedBy(event) {
  return event instanceof KeyboardEvent ? event.key : ''
}

describe('printed', () => {
  test('is a key bound with no modifiers', () => {
    expect(keyParse('printed', [printed()]).lookup).toBe('printed')
    expect(() => keyParse('ctrl+printed', [printed()])).toThrow(`Key "printed" can't be bound with modifiers`)
    expect(() => keyParse('shift+printed', [printed()])).toThrow("can't be bound with modifiers")
  })

  test('is looked up last, for a key typing one character with no Ctrl, Alt or Meta', () => {
    expect(lookups({ code: 'Slash', key: '?', shiftKey: true })).toEqual(['shift+?', 'shift+slash', '?', 'printed'])
    expect(lookups({ code: 'Space', key: ' ' })).toEqual([' ', 'space', 'printed'])
    expect(lookups({ code: 'KeyA', ctrlKey: true, key: 'a' })).not.toContain('printed')
    expect(lookups({ altKey: true, code: 'KeyA', key: 'å' })).not.toContain('printed')
    expect(lookups({ code: 'Enter', key: 'Enter' })).not.toContain('printed')
  })

  test('gets the key typed, after the bindings to that key', () => {
    /** @type {string[]} */
    const typed = []
    const keys = listening(
      [
        {
          keys: ['printed'],
          run: (event) => {
            typed.push(typedBy(event))
          },
        },
        {
          keys: ['x'],
          run: () => {
            typed.push('x bound')
          },
        },
      ],
      { syntax: [printed()] },
    )
    keys.tap('a')
    keys.tap('A', { code: 'KeyA', shiftKey: true })
    keys.tap('x')
    keys.tap('b', { ctrlKey: true })
    expect(typed).toEqual(['a', 'A', 'x bound'])
    keys.stop()
  })

  test('takes Space while typing is under way, when the binding to Space applies only when not typing', () => {
    /** @type {string[]} */
    const log = []
    let typing = false
    const keys = listening(
      [
        {
          keys: ['space'],
          run: () => {
            log.push('select')
          },
          when: () => !typing,
        },
        {
          keys: ['printed'],
          run: (event) => {
            typing = true
            log.push(`type "${typedBy(event)}"`)
          },
        },
      ],
      { syntax: [printed()] },
    )
    keys.tap(' ', { code: 'Space' })
    keys.tap('f')
    const space = keys.tap(' ', { code: 'Space' })
    expect([log, space.defaultPrevented]).toEqual([['select', 'type "f"', 'type " "'], true])
    keys.stop()
  })
})
