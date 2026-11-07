/**
 * @import { Change, ItemSource } from './source.js'
 * @import { EffectType, Extension, Transaction } from './state.js'
 * @import { ListPipeline, RenderRow, Row } from './list-pipeline.js'
 */

import { describe, expect, test } from 'bun:test'

import { keyInput } from './inputs.js'
import { listPipeline, mergeAttributes, rowsOf } from './list-pipeline.js'
import { Listeners } from './listeners.js'
import { MemorySource } from './memory-source.js'
import { defineEffect, defineField, precedence } from './state.js'
import { Store, inputHandler } from './store.js'

const FRUIT = ['apple', 'banana', 'cherry', 'damson', 'elder']

/**
 * A pipeline over some fruit, rendering to text.
 * @param {readonly string[]} [items] - The fruit
 * @returns {ListPipeline<string, string, MemorySource<string>>} The pipeline
 */
function fruit(items = FRUIT) {
  return listPipeline(new MemorySource(items, (item) => item))
}

/**
 * A plain rendering, last: an item as its text, a gap as how many it stands for, the rows joined by spaces.
 * @template {ItemSource<string>} S
 * @param {ListPipeline<string, string, S>} list - The list
 * @returns {Extension} The rendering
 */
function plain(list) {
  return precedence('lowest', [
    list.item.of((row) => (row.kind === 'gap' ? `[${String(row.to - row.from)}]` : (row.item ?? '…'))),
    list.container.of((children) => children.map(({ rendered }) => rendered).join(' ')),
  ])
}

describe('the item and container stages', () => {
  test('render every row through the steps, outermost first, the plain rendering last', () => {
    const list = fruit(['apple', 'banana'])
    const loud = list.item.of((row, next) => next(row).toUpperCase())
    const bracketed = precedence(
      'high',
      list.item.of((row, next) => `<${next(row)}>`),
    )
    const store = new Store([list.extension, plain(list), loud, bracketed])
    expect(list.render(store.state)).toBe('<APPLE> <BANANA>')
  })

  test('let a step replace whatever comes after it by not handing the row on', () => {
    const list = fruit(['apple'])
    const store = new Store([list.extension, plain(list), list.item.of(() => 'mine')])
    expect(list.render(store.state)).toBe('mine')
  })

  test('fail when nothing renders a row', () => {
    const list = fruit()
    const store = new Store([list.extension, list.container.of(() => '')])
    expect(() => list.render(store.state)).toThrow('Nothing renders an item row')
  })
})

describe('attributes', () => {
  test('join parts, classes and styles, and otherwise take the first given', () => {
    const merged = mergeAttributes([
      { 'aria-selected': 'true', hidden: undefined, part: 'row' },
      { 'aria-selected': 'false', hidden: false, part: 'active', style: 'a: 1' },
      { style: 'b: 2' },
    ])
    expect(merged).toEqual({ 'aria-selected': 'true', hidden: false, part: 'row active', style: 'a: 1; b: 2' })
  })

  test('come from every extension, for each row and for the container', () => {
    const list = fruit(['apple'])
    const store = new Store([
      list.extension,
      list.attributes.of((row) => ({ part: 'row', 'data-position': row.kind === 'item' ? row.position : undefined })),
      list.attributes.of(() => ({ part: 'mine' })),
      list.containerAttributes.of(() => ({ role: 'listbox' })),
    ])
    /** @type {RenderRow<string>} */
    const row = { item: 'apple', key: 'apple', kind: 'item', position: 0 }
    expect(list.attributesOf(row, store.state)).toEqual({ 'data-position': 0, part: 'row mine' })
    expect(list.containerAttributesOf(store.state)).toEqual({ role: 'listbox' })
  })
})

describe('the list stage', () => {
  test('makes the list a source at a time, applying a step again only when what it depends on changes', () => {
    const list = fruit()
    /** @type {EffectType<string>} */
    const search = defineEffect()
    const query = defineField({
      create: () => '',
      update: (value, transaction) => transaction.effectsOf(search).at(-1) ?? value,
    })
    /** @type {EffectType<undefined>} */
    const nothing = defineEffect()
    let applied = 0
    const filtering = list.transform.of({
      apply: (source, state) => {
        applied += 1
        const items = source.read(0, source.count())
        const wanted = state.field(query)
        return new MemorySource(
          items instanceof Promise ? [] : items.filter((item) => item.includes(wanted)),
          (item) => item,
        )
      },
      depends: (state) => state.field(query),
    })
    const store = new Store([list.extension, query, filtering, plain(list)])
    store.dispatch({ effects: search.of('an') })
    expect(list.render(store.state)).toBe('banana')
    store.dispatch({ effects: nothing.of(undefined) })
    expect(applied).toBe(2)
  })

  test('chooses the rows rendered, and what stands for the rest', () => {
    const list = fruit()
    const window = list.rows.of((rows) => {
      /** @type {Row[]} */
      const shown = [{ from: 0, kind: 'gap', to: 2 }]
      for (let position = 2; position < 4; position += 1) {
        shown.push({ kind: 'item', position })
      }
      shown.push({ from: 4, kind: 'gap', to: rows.length })
      return rowsOf(shown)
    })
    const store = new Store([list.extension, window, plain(list)])
    expect(list.render(store.state)).toBe('[2] cherry damson [1]')
  })

  test('moves the positions fields hold with the changes the list reports, and drops them when it is replaced', () => {
    const source = new MemorySource(['b', 'c'], (item) => item)
    const list = listPipeline(source)
    /** @type {EffectType<number>} */
    const go = defineEffect()
    /**
     * @type {Readonly<{
     *   create: () => number | undefined,
     *   update: (value: number | undefined, transaction: Transaction) => number | undefined,
     * }>}
     */
    const following = {
      create: () => 1,
      update: (value, transaction) => {
        const set = transaction.effectsOf(go).at(-1)
        return set ?? (value === undefined ? undefined : list.mapPosition(value, transaction))
      },
    }
    const held = defineField(following)
    const store = new Store([list.extension, held])
    source.insert(0, ['a'])
    expect(store.state.field(held)).toBe(2)
    store.dispatch({ effects: list.setSource.of(new MemorySource(['x'], (item) => item)) })
    expect(store.state.field(held)).toBeUndefined()
  })

  test('renders an item a source gives later as not read yet, until the source reports it arrived', async () => {
    /** @type {Listeners<Change>} */
    const changes = new Listeners()
    /** @type {{ arriving: Promise<readonly string[]> | undefined }} */
    const read = { arriving: undefined }
    /**
     * Gives the item once it has arrived, reporting its arrival.
     * @returns {Promise<readonly string[]>} The item
     */
    const arrive = async () => {
      await Promise.resolve()
      changes.emit({ end: 1, kind: 'changed', start: 0 })
      return ['apple']
    }
    /** @type {ItemSource<string>} */
    const later = {
      count: () => 1,
      key: (item) => item,
      read: () => {
        if (read.arriving === undefined) {
          read.arriving = arrive()
          return read.arriving
        }
        return ['apple']
      },
      subscribe: (listener) => changes.add(listener),
    }
    /** @type {ListPipeline<string, string>} */
    const list = listPipeline(later)
    const store = new Store([list.extension, plain(list)])
    /** @type {string[]} */
    const rendered = [list.render(store.state)]
    store.subscribe(() => {
      rendered.push(list.render(store.state))
    })
    await read.arriving
    expect(rendered).toEqual(['…', 'apple'])
  })
})

describe('extensions that never name each other', () => {
  test('meet through the effects they send and handle', () => {
    const list = fruit()
    /** @type {EffectType<number>} */
    const moveTo = defineEffect()
    const active = defineField({
      create: () => 0,
      update: (value, transaction) => transaction.effectsOf(moveTo).at(-1) ?? value,
    })
    const navigation = [
      active,
      inputHandler.of((input, store) => {
        if (!input.is(keyInput) || input.value.key !== 'ArrowDown') {
          return false
        }
        const to = Math.min(store.state.field(active) + 1, list.listOf(store.state).count() - 1)
        store.dispatch({ effects: [moveTo.of(to), list.reveal.of(to)] })
        return true
      }),
      list.keep.of((state) => [state.field(active)]),
    ]
    const SHOWN = 2
    const top = defineField({
      create: () => 0,
      update: (value, transaction) => {
        const revealed = transaction.effectsOf(list.reveal).at(-1)
        if (revealed === undefined) {
          return value
        }
        return revealed < value ? revealed : Math.max(value, revealed - SHOWN + 1)
      },
    })
    const windowing = [
      top,
      list.reveals.of(true),
      list.rows.of((rows, state) => {
        const start = state.field(top)
        /** @type {Row[]} */
        const shown = [{ from: 0, kind: 'gap', to: start }]
        for (let position = start; position < start + SHOWN; position += 1) {
          shown.push({ kind: 'item', position })
        }
        shown.push({ from: start + SHOWN, kind: 'gap', to: rows.length })
        return rowsOf(shown)
      }),
    ]
    const store = new Store([list.extension, navigation, windowing, plain(list)])
    const down = keyInput.of({ alt: false, key: 'ArrowDown', shift: false, toggle: false })
    expect(store.handle(down)).toBe(true)
    expect(list.render(store.state)).toBe('[0] apple banana [3]')
    store.handle(down)
    expect(list.render(store.state)).toBe('[1] banana cherry [2]')
    expect(store.state.facet(list.reveals)).toBe(true)
    expect(store.state.facet(list.keep)(store.state)).toEqual([2])
  })
})
