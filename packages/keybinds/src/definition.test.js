import { describe, expect, test } from 'bun:test'

import { commandOf } from './definition.js'

const TOP = 3
const TRUTHY = 1

describe('a definition taken as a command', () => {
  test('runs its execute, and keeps the fields a command has, typed as a command types them', () => {
    const definition = {
      anyModifiers: true,
      execute: () => 'ran',
      id: 'save',
      label: 'Save',
      menu: ['file'],
      rank: TOP,
      when: () => TRUTHY,
    }
    const command = commandOf(definition)
    expect([command.execute({}), command.when?.({}), command.rank, command.menu, command.anyModifiers]).toEqual([
      'ran',
      true,
      TOP,
      ['file'],
      true,
    ])
  })

  test('is refused without a function to run', () => {
    expect(() => commandOf({ id: 'save', label: 'Save' })).toThrow('"save" has no execute function')
  })

  test.each(['when', 'rank', 'menu', 'captureInput', 'anyModifiers'])(
    'is refused with a %s of the wrong type',
    (field) => {
      const wrong = Object.fromEntries([[field, [TRUTHY]]])
      const definition = { ...wrong, execute: () => undefined, id: 'save', label: 'Save' }
      expect(() => commandOf(definition)).toThrow(`"save" has a ${field} that isn't one`)
    },
  )
})
