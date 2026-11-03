import { describe, expect, test } from 'bun:test'

import { findConflict } from './binding.js'
import { validateCommands } from './core.js'
import { parseGamepad } from './gamepad.js'
import { mergeBindings } from './store.js'
import { ALL, INPUT } from './test-inputs.js'

describe('gamepad bindings', () => {
  test('name buttons by their standard names and aliases', () => {
    expect(parseGamepad('South')).toBe('a')
    expect(parseGamepad('dpadUp')).toBe('up')
    expect(() =>
      validateCommands(
        [{ execute: () => undefined, gamepad: ['a', 'south', 'rt:up', 'dpadUp'], id: 'j', label: 'J' }],
        ALL,
      ),
    ).not.toThrow()
  })

  test('take no modifiers, and no unknown buttons', () => {
    expect(() =>
      validateCommands([{ execute: () => undefined, gamepad: ['shift+a'], id: 'j', label: 'J' }], ALL),
    ).toThrow(/Unknown gamepad button/u)
  })

  test('conflict by button whatever name they use, and can be overridden', () => {
    const schema = { fire: { gamepad: ['rt'], label: 'Fire' }, jump: { gamepad: ['a'], label: 'Jump' } }
    expect(findConflict(schema, { binding: 'south', except: 'fire', input: INPUT.gamepad })).toEqual({
      commandId: 'jump',
      label: 'Jump',
    })
    expect(mergeBindings(schema, { jump: { gamepad: ['b'] } })['jump']?.gamepad).toEqual(['b'])
  })
})
