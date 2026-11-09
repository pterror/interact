import { describe, expect, test } from 'bun:test'

import { bindingTable } from './binding-table.js'

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

describe('bindingTable', () => {
  test("finds every lookup's handlers, best first, each once", () => {
    const [a, keyA, both, other] = [handler('a'), handler('keyA'), handler('both'), handler('other')]
    const find = bindingTable([
      ['keya', keyA],
      ['a', a],
      ['a', both],
      ['keya', both],
      ['b', other],
    ])
    expect(names(find({ exact: ['a', 'keya'] }))).toEqual(['a', 'both', 'keyA'])
    expect(find({ exact: ['c'] })).toEqual([])
  })
})
