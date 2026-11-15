import { describe, expect, test } from 'bun:test'

import { arrayList } from './array-list.js'
import { cell } from './cell.js'
import { filtered } from './filtered.js'
import { textValue } from './text-value.js'

/**
 * Whether a key starts with the query, ignoring case
 * @param {string} key - The key
 * @param {string} query - The query
 * @returns {boolean} Whether it does
 */
const startsWith = (key, query) => key.toLowerCase().startsWith(query.toLowerCase())

describe('filtered', () => {
  test('keeps the keys that match, in the list order, as the query and the list change', () => {
    const list = arrayList(['Copy', 'Cut', 'Paste', 'Close'])
    const query = cell('')
    const kept = filtered({ list, matches: startsWith, query })
    let heard = 0
    kept.watch(() => {
      heard += 1
    })
    expect(kept.keys()).toEqual(['Copy', 'Cut', 'Paste', 'Close'])
    query.set('c')
    expect(kept.keys()).toEqual(['Copy', 'Cut', 'Close'])
    list.set(['Close', 'Paste', 'Cut'])
    expect(kept.keys()).toEqual(['Close', 'Cut'])
    expect(heard).toBe(2)
  })

  test('moves a held key the query leaves out, before its listeners hear the keys', () => {
    const list = arrayList(['Copy', 'Cut', 'Paste'])
    const query = cell('')
    const kept = filtered({ list, matches: startsWith, query })
    const active = kept.hold('Paste', 'next')
    /** @type {(string | undefined)[]} */
    const seen = []
    kept.watch(() => {
      seen.push(active.get())
    })
    query.set('c')
    expect(active.get()).toBe('Cut')
    expect(seen).toEqual(['Cut'])
    active.set('Paste')
    expect(active.get()).toBe('Cut')
  })

  test('stops following the list and the query', () => {
    const list = arrayList(['a', 'b'])
    const query = cell('')
    const kept = filtered({ list, matches: startsWith, query })
    kept.stop()
    query.set('a')
    expect(kept.keys()).toEqual(['a', 'b'])
  })
})

describe('textValue', () => {
  test('reads and sets a field, and hears typing and its own sets', () => {
    const field = document.createElement('input')
    const value = textValue({ field })
    let heard = 0
    const stop = value.watch(() => {
      heard += 1
    })
    value.set('co')
    expect(field.value).toBe('co')
    field.value = 'cop'
    field.dispatchEvent(new Event('input'))
    expect(value.get()).toBe('cop')
    value.set('cop')
    expect(heard).toBe(2)
    stop()
    field.dispatchEvent(new Event('input'))
    expect(heard).toBe(2)
  })

  test('a filter over it follows what is typed', () => {
    const field = document.createElement('input')
    const kept = filtered({ list: arrayList(['Copy', 'Paste']), matches: startsWith, query: textValue({ field }) })
    field.value = 'p'
    field.dispatchEvent(new Event('input'))
    expect(kept.keys()).toEqual(['Paste'])
  })
})
