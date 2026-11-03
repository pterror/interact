import { describe, expect, mock, test } from 'bun:test'

import { bindingsOf, executeCommand, isActive } from './command.js'

describe('executeCommand', () => {
  test('runs the command with that id, and says it ran', () => {
    const execute = mock(() => undefined)
    expect(executeCommand([{ execute, id: 'save', label: 'Save' }], 'save')).toBe(true)
    expect(execute).toHaveBeenCalled()
  })

  test('runs nothing for an unknown id', () => {
    expect(executeCommand([], 'nonexistent')).toBe(false)
  })

  test('runs nothing that does not apply', () => {
    const execute = mock(() => undefined)
    expect(executeCommand([{ execute, id: 'x', label: 'X', when: () => false }], 'x')).toBe(false)
    expect(execute).not.toHaveBeenCalled()
  })
})

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
