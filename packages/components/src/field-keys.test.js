/** @import { Span } from '@interact/core/memory-source' */

import { describe, expect, test } from 'bun:test'

import { MemorySource } from '@interact/core'

import { fieldListKey } from './field-keys.js'
import { Listbox } from './legacy-listbox.js'

const FIRST = 0
const SECOND = 1

/**
 * A list of three words, the first active.
 * @returns {Listbox<string, Span>} The list
 */
function words() {
  const listbox = new Listbox({ mode: 'none', source: new MemorySource(['ant', 'bee', 'cat'], (word) => word) })
  listbox.active.set(FIRST)
  return listbox
}

describe('a key typed in a text field', () => {
  test('goes to the list it controls when it is an arrow or page key', () => {
    const listbox = words()
    expect([fieldListKey(listbox, 'ArrowDown'), listbox.active.get()]).toEqual([true, SECOND])
  })

  test('stays with the field when it edits the text', () => {
    const listbox = words()
    const kept = ['Home', 'End', 'ArrowLeft', 'ArrowRight', 'a'].map((key) => fieldListKey(listbox, key))
    expect([kept, listbox.active.get()]).toEqual([[false, false, false, false, false], FIRST])
  })
})
