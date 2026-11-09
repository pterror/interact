/**
 * @import { Command } from './command.js'
 * @import { FakePads } from './test-pads.js'
 */

import { afterEach, describe, expect, mock, test } from 'bun:test'

import { findConflict } from './binding.js'
import { parseGamepad } from './gamepad.js'
import { withOverride } from './schema.js'
import { accepts, keybinds, recording } from './test-helpers.js'
import { ALL, INPUT } from './test-inputs.js'
import { fakePads } from './test-pads.js'

describe('gamepad bindings', () => {
  test('name buttons by their standard names and aliases', () => {
    expect(parseGamepad('South')).toBe('a')
    expect(parseGamepad('dpadUp')).toBe('up')
    expect(() =>
      accepts([{ execute: () => undefined, gamepad: ['a', 'south', 'rt:up', 'dpadUp'], id: 'j', label: 'J' }], ALL),
    ).not.toThrow()
  })

  test('take no modifiers, and no unknown buttons', () => {
    expect(() => accepts([{ execute: () => undefined, gamepad: ['shift+a'], id: 'j', label: 'J' }], ALL)).toThrow(
      /Unknown gamepad button/u,
    )
  })

  test('conflict by button whatever name they use, and can be overridden', () => {
    const schema = { fire: { gamepad: ['rt'], label: 'Fire' }, jump: { gamepad: ['a'], label: 'Jump' } }
    expect(findConflict(schema, { binding: 'south', except: 'fire', input: INPUT.gamepad })).toEqual({
      commandId: 'jump',
      label: 'Jump',
    })
    expect(withOverride(schema.jump, { gamepad: ['b'] }).gamepad).toEqual(['b'])
  })
})

const BUTTON_A = 0
const BUTTON_RT = 7
const FIRST = 0

/** @type {(() => void)[]} */
const cleanups = []

afterEach(() => {
  for (const cleanup of cleanups.splice(FIRST)) {
    cleanup()
  }
})

/**
 * Fake pads for one test, put back after it, with one pad connected and nothing down
 * @returns {FakePads} The pads
 */
function onePad() {
  const pads = fakePads()
  cleanups.push(pads.restore)
  pads.set([])
  return pads
}

/**
 * Listens for gamepad commands, stopping after the test
 * @param {readonly Command[]} commands - The commands
 * @returns {(id: string) => boolean} Whether a command is held
 */
function listen(commands) {
  const listening = keybinds(commands)
  cleanups.push(listening)
  return listening.held
}

describe('gamepad buttons', () => {
  test('pressing and letting go run their bindings, and held follows the button', () => {
    const fired = recording()
    const pads = onePad()
    const held = listen([{ execute: fired.execute, gamepad: ['a', 'a:up'], id: 'jump', label: 'Jump' }])
    pads.frame()
    pads.set([BUTTON_A])
    pads.frame()
    expect([fired.types, held('jump')]).toEqual([['gamepadbuttondown'], true])
    pads.set([])
    pads.frame()
    expect([fired.types, held('jump')]).toEqual([['gamepadbuttondown', 'gamepadbuttonup'], false])
  })

  test('a button already down when the pad is first seen is not a press', () => {
    const execute = mock(() => undefined)
    const pads = onePad()
    pads.set([BUTTON_A])
    listen([{ execute, gamepad: ['a'], id: 'jump', label: 'Jump' }])
    pads.frame()
    pads.frame()
    expect(execute).not.toHaveBeenCalled()
  })

  test('a pad going away lets go of its buttons', () => {
    const pads = onePad()
    const held = listen([{ execute: () => undefined, gamepad: ['rt'], id: 'fire', label: 'Fire' }])
    pads.frame()
    pads.set([BUTTON_RT])
    pads.frame()
    expect(held('fire')).toBe(true)
    pads.set()
    pads.frame()
    expect(held('fire')).toBe(false)
  })

  test('nothing reads pads without a gamepad binding', () => {
    onePad()
    const frames = mock(globalThis.requestAnimationFrame)
    globalThis.requestAnimationFrame = frames
    listen([{ execute: () => undefined, id: 'k', keys: ['k'], label: 'K' }])
    expect(frames).not.toHaveBeenCalled()
  })
})
