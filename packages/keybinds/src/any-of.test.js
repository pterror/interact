import { describe, expect, test } from 'bun:test'

import { anyOf } from './any-of.js'
import { bindingTable } from './binding-table.js'
import { looseTable } from './loose-table.js'

/**
 * @typedef {Readonly<{ exact: readonly string[], bare: readonly string[], mods: Readonly<{ ctrl: boolean,
 *   alt: boolean, shift: boolean, meta: boolean }> }>} Query
 */

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

describe('anyOf', () => {
  test('finds through each in order, each handler once', () => {
    const [exact, loose] = [handler('exact'), handler('loose')]
    /** @type {(query: Query) => readonly Readonly<{ name: string, run: () => void }>[]} */
    const exactly = bindingTable([['shift+x', exact]])
    /** @type {(query: Query) => readonly Readonly<{ name: string, run: () => void }>[]} */
    const loosely = looseTable([
      ['x', NONE, loose],
      ['x', NONE, exact],
    ])
    const find = anyOf(exactly, loosely)
    expect(names(find({ bare: ['x'], exact: ['shift+x'], mods: SHIFT }))).toEqual(['exact', 'loose'])
  })
})
