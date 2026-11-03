import { describe, expect, test } from 'bun:test'

import { findConflict, flipRelease, parseBinding, splitBinding, splitRelease } from './binding.js'
import { INPUT } from './test-inputs.js'

const SCHEMA = {
  close: { keys: ['$mod+w'], label: 'Close' },
  open: { keys: ['$mod+o'], label: 'Open', mouse: ['$mod+click'] },
  save: { keys: ['$mod+s'], label: 'Save' },
}

describe('findConflict', () => {
  test('finds nothing for a binding no command has', () => {
    expect(findConflict(SCHEMA, { binding: '$mod+k', input: INPUT.keys })).toBeUndefined()
  })

  test('finds the command a key or mouse binding is already bound to', () => {
    expect(findConflict(SCHEMA, { binding: '$mod+s', input: INPUT.keys })).toEqual({ commandId: 'save', label: 'Save' })
    expect(findConflict(SCHEMA, { binding: '$mod+click', input: INPUT.mouse })).toEqual({
      commandId: 'open',
      label: 'Open',
    })
  })

  test('leaves out the command being rebound', () => {
    expect(findConflict(SCHEMA, { binding: '$mod+s', except: 'save', input: INPUT.keys })).toBeUndefined()
  })

  test('compares bindings as they parse: Ctrl+s is $mod+s away from a Mac', () => {
    expect(findConflict(SCHEMA, { binding: 'ctrl+s', input: INPUT.keys })).toEqual({ commandId: 'save', label: 'Save' })
  })

  test('tells a press from its release', () => {
    const schema = { press: { keys: ['k'], label: 'Press', mouse: ['middle'] } }
    expect(findConflict(schema, { binding: 'k:up', input: INPUT.keys })).toBeUndefined()
    expect(findConflict(schema, { binding: 'middle:up', input: INPUT.mouse })).toBeUndefined()
    expect(findConflict(schema, { binding: 'K', input: INPUT.keys })?.commandId).toBe('press')
    const released = { release: { keys: ['k:up'], label: 'Release' } }
    expect(findConflict(released, { binding: 'K:UP', input: INPUT.keys })?.commandId).toBe('release')
  })
})

describe('bindings as strings', () => {
  test('split into steps and a suffix, whatever syntax is on', () => {
    expect(splitBinding('g  i')).toEqual({ steps: ['g', 'i'], suffix: '' })
    expect(splitBinding('ctrl + k:HOLD')).toEqual({ steps: ['ctrl+k'], suffix: ':hold' })
  })

  test('flip between a press and its release, kept as written', () => {
    expect(splitRelease('ctrl+k:up')).toEqual({ body: 'ctrl+k', release: true })
    expect(flipRelease('Ctrl+K')).toBe('Ctrl+K:up')
    expect(flipRelease('Ctrl+K:UP')).toBe('Ctrl+K')
  })

  test('parse only with the syntax that is on, naming the module that is missing', () => {
    expect(parseBinding(INPUT.keys, 'ctrl+k', {}).lookup).toBe('ctrl+k')
    expect(() => parseBinding(INPUT.keys, 'k:up', {})).toThrow('needs releases()')
    expect(() => parseBinding(INPUT.keys, 'g i', {})).toThrow('needs sequences()')
    expect(() => parseBinding(INPUT.keys, '', {})).toThrow('Invalid binding')
  })
})
