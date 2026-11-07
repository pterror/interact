// Legacy: tests of a module the menu, palette and combobox still run on until they are rebuilt (docs/design.md).
import { describe, expect, test } from 'bun:test'

import { Typeahead, WAIT } from './legacy-typeahead.js'

const QUICK = 100

/**
 * A clock that moves only when told.
 * @returns {Readonly<{ now: () => number, pass: (milliseconds: number) => void }>} It, and a way to move it on
 */
function clock() {
  let time = 0
  return {
    now: () => time,
    pass: (milliseconds) => {
      time += milliseconds
    },
  }
}

describe('Typeahead', () => {
  test('looks after the active item for a first character, and at it for more of the same word', () => {
    const time = clock()
    const typeahead = new Typeahead(time.now)
    expect(typeahead.type('b')).toEqual({ after: true, cycle: undefined, text: 'b' })
    time.pass(QUICK)
    expect(typeahead.type('l')).toEqual({ after: false, cycle: undefined, text: 'bl' })
  })

  test('looks for a character typed again and again as it was typed, then for the character alone', () => {
    const time = clock()
    const typeahead = new Typeahead(time.now)
    typeahead.type('b')
    time.pass(QUICK)
    expect(typeahead.type('b')).toEqual({ after: false, cycle: 'b', text: 'bb' })
  })

  test('forgets what was typed after a pause, and only then lets a space mean itself', () => {
    const time = clock()
    const typeahead = new Typeahead(time.now)
    expect(typeahead.typing).toBe(false)
    typeahead.type('b')
    expect(typeahead.typing).toBe(true)
    time.pass(WAIT)
    expect(typeahead.typing).toBe(false)
    expect(typeahead.type('l')).toEqual({ after: true, cycle: undefined, text: 'l' })
  })
})
