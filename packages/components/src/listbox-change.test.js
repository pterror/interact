/** @import { Span } from '@interact/core/memory-source' */

import { describe, expect, test } from 'bun:test'

import { MemorySource } from '@interact/core'

import { Listbox } from './listbox.js'

const NONE = 0
const ONE = 1

describe('a listbox whose items change in place', () => {
  test('shows the new items, read again, with the active item where it was', () => {
    const source = new MemorySource(['apple', 'banana'], (item) => item)
    /** @type {Listbox<string, Span>} */
    const listbox = new Listbox({ source })
    listbox.goTo(ONE)
    source.replace(NONE, ['cherry', 'damson'])
    expect([listbox.items.item(NONE), listbox.items.item(ONE), listbox.active.get()]).toEqual(['cherry', 'damson', ONE])
  })
})
