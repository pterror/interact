import { describe, expect, test } from 'bun:test'

import { bindingsOf, isActive } from './command.js'

describe('commands', () => {
  test('apply without a `when`, and with one that holds in the context', () => {
    expect(isActive({}, {})).toBe(true)
    expect(isActive({ when: (ctx) => ctx['ready'] === true }, { ready: true })).toBe(true)
    expect(isActive({ when: (ctx) => ctx['ready'] === true }, {})).toBe(false)
  })

  test('have no bindings through an input they name none for', () => {
    const command = { execute: () => undefined, id: 'x', keys: ['k'], label: 'X' }
    expect(bindingsOf(command, 'keys')).toEqual(['k'])
    expect(bindingsOf(command, 'mouse')).toEqual([])
  })
})
