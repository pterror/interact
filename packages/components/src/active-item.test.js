/**
 * @import { ListPipeline, RenderRow } from '@interact/core/list-pipeline'
 * @import { ItemSource } from '@interact/core/source'
 * @import { TemplateResult } from '@interact/dom/template'
 * @import { ActiveItem } from './active-item.js'
 */

import { describe, expect, test } from 'bun:test'

import { MemorySource, Store, listPipeline } from '@interact/core'
import { defaultRendering } from '@interact/dom'

import { active } from './active-item.js'
import { listbox } from './listbox.js'

const SEPARATOR = '—'

/**
 * A listbox of some items with its active item, the default rendering and no other extension, which focus passes over
 * separators in.
 * @param {MemorySource<string>} source - The items
 * @returns {Readonly<{ store: Store, current: ActiveItem<string, TemplateResult, MemorySource<string>> }>} The store
 *   and the active item
 */
function bare(source) {
  /** @type {ListPipeline<string, TemplateResult, MemorySource<string>>} */
  const list = listPipeline(source)
  const current = active(list)
  const skips = current.skip.of((item) => item === SEPARATOR)
  return { current, store: new Store([current, listbox(current, { id: 'x' }), skips, defaultRendering(list)]) }
}

describe('the active item', () => {
  test('moves with the items as others are inserted before it', () => {
    const source = new MemorySource(['a', 'b', 'c'], (item) => item)
    const { current, store } = bare(source)
    store.dispatch({ effects: current.go(2) })
    source.insert(0, ['z'])
    expect(current.positionIn(store.state)).toBe(3)
  })

  test('is nothing once its item goes, or the list is replaced', () => {
    const source = new MemorySource(['a', 'b', 'c'], (item) => item)
    const { current, store } = bare(source)
    store.dispatch({ effects: current.go(1) })
    source.remove(1, 2)
    expect(current.positionIn(store.state)).toBeUndefined()
    store.dispatch({ effects: current.go(0) })
    store.dispatch({ effects: current.list.setSource.of(new MemorySource(['x'], (item) => item)) })
    expect(current.positionIn(store.state)).toBeUndefined()
  })

  test('is made by a press when nothing else takes it', () => {
    const { current, store } = bare(new MemorySource(['a', 'b'], (item) => item))
    store.handle(current.list.press.of({ count: 1, position: 1, shift: false, toggle: false }))
    expect(current.positionIn(store.state)).toBe(1)
  })

  test('stays rendered, and is marked', () => {
    const { current, store } = bare(new MemorySource(['a', 'b'], (item) => item))
    store.dispatch({ effects: current.go(1) })
    expect(store.state.facet(current.list.keep)(store.state)).toEqual([1])
    /** @type {RenderRow<string>} */
    const row = { item: 'b', key: 'b', kind: 'item', position: 1 }
    expect(current.list.attributesOf(row, store.state)['part']).toBe('active option row')
  })

  test('lands only where focus can rest, looking the other way when it must', () => {
    const { current, store } = bare(new MemorySource(['Cut', SEPARATOR, 'Copy', 'Paste', SEPARATOR], (item) => item))
    expect([current.landing(store.state, 1, 1), current.landing(store.state, 1, -1)]).toEqual([2, 0])
    expect(current.landing(store.state, 4, 1)).toBe(3)
  })
})

describe('the active descendant', () => {
  test('is named only once its item has arrived', () => {
    /** @type {PromiseWithResolvers<readonly string[]>} */
    const never = Promise.withResolvers()
    /** @type {ItemSource<string>} */
    const later = {
      count: () => 3,
      key: (item) => item,
      read: async () => never.promise,
      subscribe: () => () => undefined,
    }
    /** @type {ListPipeline<string, TemplateResult>} */
    const list = listPipeline(later)
    const current = active(list)
    const store = new Store([current, listbox(current, { id: 'x' })])
    store.dispatch({ effects: current.go(0) })
    expect(list.containerAttributesOf(store.state)['aria-activedescendant']).toBeUndefined()
  })
})
