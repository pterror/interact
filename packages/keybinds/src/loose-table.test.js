import { describe, expect, test } from 'bun:test'

import { looseTable } from './loose-table.js'

const NONE = { alt: false, ctrl: false, meta: false, shift: false }
const SHIFT = { ...NONE, shift: true }

/**
 * A handler that does nothing, with a name to tell it by
 * @param {string} name - Its name
 * @returns {Readonly<{ name: string, run: () => void }>} It
 */
function handler(name) {
  return { name, run: () => undefined }
}

/**
 * The names of some handlers
 * @param {readonly Readonly<{ name: string }>[]} handlers - The handlers
 * @returns {readonly string[]} Their names
 */
function names(handlers) {
  return handlers.map((each) => each.name)
}

describe('looseTable', () => {
  test('matches whatever other modifiers are held, its own still required', () => {
    const [w, shiftX] = [handler('w'), handler('shiftX')]
    const find = looseTable([
      ['w', NONE, w],
      ['x', SHIFT, shiftX],
    ])
    expect(names(find({ bare: ['w'], mods: { ...NONE, alt: true, ctrl: true } }))).toEqual(['w'])
    expect(find({ bare: ['x'], mods: { ...NONE, ctrl: true } })).toEqual([])
    expect(names(find({ bare: ['x'], mods: { ...SHIFT, ctrl: true } }))).toEqual(['shiftX'])
  })
})
