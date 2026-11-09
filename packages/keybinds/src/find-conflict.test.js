import { describe, expect, test } from 'bun:test'

import { bindingLookup } from './binding-lookup.js'
import { findConflict } from './find-conflict.js'
import { keyParse } from './key-parse.js'
import { mouseParse } from './mouse-parse.js'

const BINDINGS = {
  close: { keys: ['$mod+w'], label: 'Close' },
  open: { keys: ['$mod+o'], label: 'Open', mouse: ['$mod+click'] },
  save: { keys: ['$mod+s'], label: 'Save' },
}

const keys = bindingLookup((step) => keyParse(step))
const mouse = bindingLookup(mouseParse)

describe('findConflict', () => {
  test('finds nothing for a binding no id has', () => {
    expect(findConflict(BINDINGS, { binding: '$mod+k', field: 'keys', lookup: keys })).toBeUndefined()
  })

  test('finds the id a key or mouse binding is already bound to, but not the one being rebound', () => {
    expect(findConflict(BINDINGS, { binding: '$mod+s', field: 'keys', lookup: keys })).toBe('save')
    expect(findConflict(BINDINGS, { binding: '$mod+click', field: 'mouse', lookup: mouse })).toBe('open')
    expect(findConflict(BINDINGS, { binding: '$mod+s', except: 'save', field: 'keys', lookup: keys })).toBeUndefined()
  })

  test('compares bindings as they parse, and finds nothing for one that does not', () => {
    const ctrl = { save: { keys: ['ctrl+s'], label: 'Save' } }
    expect(findConflict(ctrl, { binding: 'Ctrl + S', field: 'keys', lookup: keys })).toBe('save')
    expect(findConflict(ctrl, { binding: 'ctrl+banana', field: 'keys', lookup: keys })).toBeUndefined()
  })

  test('tells a press from its release, and steps from one', () => {
    const bindings = { press: { keys: ['k', 'g i'], label: 'Press', mouse: ['middle'] } }
    expect(findConflict(bindings, { binding: 'k:up', field: 'keys', lookup: keys })).toBeUndefined()
    expect(findConflict(bindings, { binding: 'middle:up', field: 'mouse', lookup: mouse })).toBeUndefined()
    expect(findConflict(bindings, { binding: 'K', field: 'keys', lookup: keys })).toBe('press')
    expect(findConflict(bindings, { binding: 'g', field: 'keys', lookup: keys })).toBeUndefined()
    expect(findConflict(bindings, { binding: 'G  I', field: 'keys', lookup: keys })).toBe('press')
    const released = { release: { keys: ['k:up'], label: 'Release' } }
    expect(findConflict(released, { binding: 'K:UP', field: 'keys', lookup: keys })).toBe('release')
  })
})

describe('bindingLookup', () => {
  test("is a binding's steps' lookups and its suffix, and refuses one with no steps", () => {
    expect(keys('Ctrl + K:HOLD')).toBe('ctrl+k:hold')
    expect(keys('g i')).toBe('g i')
    expect(() => keys(':up')).toThrow('no steps')
  })
})
