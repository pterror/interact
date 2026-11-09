import { afterEach, describe, expect, test } from 'bun:test'

import { aliases } from './aliases.js'
import { isMac } from './modifiers.js'
import { keyBinding, recordKey } from './record-key.js'
import { symbols } from './symbols.js'
import { kbd } from './test-keys.js'

/** The platform's own modifier, as an event reports it */
const OWN = isMac ? { metaKey: true } : { ctrlKey: true }

/** @type {(() => void)[]} */
const cleanups = []

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) {
    cleanup()
  }
})

describe('keyBinding', () => {
  test('writes a key with its modifiers, $mod for the platform own', () => {
    expect(keyBinding(kbd('keydown', { code: 'KeyK', key: 'k' }))).toBe('k')
    expect(keyBinding(kbd('keydown', { code: 'KeyK', key: 'K', shiftKey: true, ...OWN }))).toBe('$mod+shift+k')
    expect(keyBinding(kbd('keydown', { code: 'Space', key: ' ' }))).toBe('space')
  })

  test('gives nothing for a modifier pressed alone, or a key that cannot be bound', () => {
    /** @type {readonly KeyboardEventInit[]} */
    const inits = [
      { code: 'ShiftLeft', key: 'Shift', shiftKey: true },
      { code: 'ControlLeft', ctrlKey: true, key: 'Control' },
      { code: 'AltLeft', key: 'Alt' },
      { code: 'MetaLeft', key: 'Meta' },
      { code: 'Unidentified', key: 'Unidentified' },
    ]
    expect(inits.map((init) => keyBinding(kbd('keydown', init)))).toEqual(inits.map(() => undefined))
  })

  test('writes a letter key typing something no binding names as the letter (Option+A types "å" on a Mac)', () => {
    expect(keyBinding(kbd('keydown', { altKey: true, code: 'KeyA', key: 'å' }))).toBe('alt+a')
  })

  test('keeps a typed character as itself where the syntax reads it, the physical key otherwise', () => {
    const syntax = [symbols(), aliases()]
    const question = kbd('keydown', { code: 'Slash', key: '?', shiftKey: true })
    const plus = kbd('keydown', { code: 'Equal', key: '+', shiftKey: true, ...OWN })
    expect([keyBinding(question, syntax), keyBinding(plus, syntax)]).toEqual(['?', '$mod+plus'])
    expect([keyBinding(question), keyBinding(plus), keyBinding(plus, [symbols()])]).toEqual([
      'shift+slash',
      '$mod+shift+equal',
      '$mod+shift+equal',
    ])
    expect(keyBinding(kbd('keydown', { code: 'Digit1', key: '1' }), syntax)).toBe('1')
  })
})

/**
 * Records a key binding from the window
 * @param {boolean} release - Whether to record a release
 * @returns {readonly string[]} What was recorded
 */
function recording(release) {
  /** @type {string[]} */
  const got = []
  cleanups.push(
    recordKey({
      done: (binding) => {
        got.push(binding)
      },
      release,
    }),
  )
  return got
}

describe('recordKey', () => {
  test('takes the next key pressed, keeping it from anything else, but not Escape', () => {
    const got = recording(false)
    const escape = kbd('keydown', { code: 'Escape', key: 'Escape' })
    const key = kbd('keydown', { code: 'KeyS', key: 's', ...OWN })
    globalThis.dispatchEvent(escape)
    globalThis.dispatchEvent(key)
    expect([got, escape.defaultPrevented, key.defaultPrevented]).toEqual([['$mod+s'], false, true])
  })

  test('with a release, waits for the same key to come up, bound with the modifiers it went down with', () => {
    const got = recording(true)
    globalThis.dispatchEvent(kbd('keydown', { code: 'KeyK', key: 'k', ...OWN }))
    globalThis.dispatchEvent(kbd('keyup', { code: 'KeyJ', key: 'j' }))
    expect(got).toEqual([])
    globalThis.dispatchEvent(kbd('keyup', { code: 'KeyK', key: 'k' }))
    expect(got).toEqual(['$mod+k:up'])
  })
})
