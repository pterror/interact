/**
 * @import { ListPipeline } from '@interact/core/list-pipeline'
 * @import { ItemSource } from '@interact/core/source'
 * @import { TemplateResult } from '@interact/dom/template'
 * @import { Move } from './reorder.js'
 */

import { describe, expect, test } from 'bun:test'

import { MemorySource, Store, listPipeline } from '@interact/core'
import { defaultRendering } from '@interact/dom'

import { active, readNow } from './active-item.js'
import { listbox } from './listbox.js'
import { navigation } from './navigation.js'
import { reorder } from './reorder.js'
import { press } from './test-helpers.js'
import { windowing } from './windowing.js'

const LETTERS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']

/**
 * Moves an item in a source as an app would: out of where it was, into where it goes.
 * @param {MemorySource<string>} source - The source
 * @param {Move} move - The move
 * @returns {void}
 */
function moveIn(source, { from, to }) {
  const [item] = source.read(from, from + 1)
  if (item !== undefined) {
    source.remove(from, from + 1)
    source.insert(to, [item])
  }
}

/**
 * A listbox of letters that can be reordered, windowed or not, its source moving items as `move` says.
 * @param {Readonly<{ rows?: number | undefined, move?: (source: MemorySource<string>, move: Move) => Promise<void>, places?: boolean }>} [how]
 *   - How many rows a window shows, if windowed; how the app moves an item; whether the list can place items by key
 * @returns {Readonly<{
 *   store: Store,
 *   source: MemorySource<string>,
 *   list: ListPipeline<string, TemplateResult, ItemSource<string>>,
 *   current: ReturnType<typeof active<string, TemplateResult, ItemSource<string>>>,
 *   reordering: ReturnType<typeof reorder<string, TemplateResult, ItemSource<string>>>,
 *   moves: readonly Move[],
 * }>} The listbox and its parts
 */
function letters(how = {}) {
  const source = new MemorySource(LETTERS, (item) => item)
  /** @type {ItemSource<string>} */
  const unplaced = {
    count: () => source.count(),
    key: (item) => source.key(item),
    read: (start, end) => source.read(start, end),
    subscribe: (listener) => source.subscribe(listener),
  }
  /** @type {ListPipeline<string, TemplateResult, ItemSource<string>>} */
  const list = listPipeline(how.places === false ? unplaced : source)
  const current = active(list)
  /** @type {Move[]} */
  const moves = []
  const reordering = reorder(current, {
    move: (move) => {
      moves.push(move)
      if (how.move === undefined) {
        moveIn(source, move)
        return undefined
      }
      return how.move(source, move)
    },
  })
  const store = new Store([
    listbox(current, { id: 'x' }),
    navigation(current),
    reordering,
    how.rows === undefined ? [] : windowing(list, { rows: how.rows }),
    defaultRendering(list),
  ])
  return { current, list, moves, reordering, source, store }
}

/**
 * What the rows show while a drag goes on: each rendered item row's position and how it is moved, if it is.
 * @param {ReturnType<typeof letters>} made - The listbox
 * @returns {string[]} Each moved row as "position: translate", and the dragged one marked
 */
function shifted({ list, store }) {
  const { state } = store
  const rows = list.rowsIn(state)
  const listed = list.listOf(state)
  /** @type {string[]} */
  const seen = []
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows.at(index)
    if (row?.kind === 'item') {
      const item = readNow(listed, row.position)?.item
      const attributes = list.attributesOf({ item, key: item ?? '', kind: 'item', position: row.position }, state)
      const style = String(attributes['style'] ?? '')
      const moved = /translate: (?<by>[^;]+)/u.exec(style)?.groups?.['by']
      const dragging = String(attributes['part']).split(' ').includes('dragging') ? ' dragging' : ''
      if (moved !== undefined) {
        seen.push(`${String(row.position)}: ${moved}${dragging}`)
      }
    }
  }
  return seen
}

/**
 * The letters in order.
 * @param {MemorySource<string>} source - The source
 * @returns {string} They, joined
 */
function order(source) {
  return source.read(0, source.count()).join('')
}

describe.each([
  ['not windowed', undefined],
  ['windowed', 5],
])('reordering a listbox, %s', (_how, rows) => {
  test('shows where a dragged row would land, the rows between making room, and nothing moved yet', () => {
    const made = letters({ rows })
    made.reordering.start(made.store, 1)
    made.reordering.dragOver(made.store, 3)
    expect(shifted(made)).toEqual(['1: 0 200% dragging', '2: 0 -100%', '3: 0 -100%'])
    made.reordering.dragOver(made.store, 0)
    expect(shifted(made)).toEqual(['0: 0 100%', '1: 0 -100% dragging'])
    expect([order(made.source), made.moves.length]).toEqual(['abcdefghij', 0])
  })

  test('drops a row where it would land, by the app moving it, the active item staying on its own item', () => {
    const made = letters({ rows })
    made.store.dispatch({ effects: made.current.go(3) })
    made.reordering.start(made.store, 1)
    made.reordering.dragOver(made.store, 4)
    made.reordering.drop(made.store)
    expect(made.moves).toEqual([{ from: 1, key: 'b', to: 4 }])
    expect(order(made.source)).toBe('acdebfghij')
    expect([made.current.positionIn(made.store.state), made.reordering.dragIn(made.store.state)]).toEqual([
      2,
      undefined,
    ])
    expect(shifted(made)).toEqual([])
  })

  test('takes the active item with it when it is the one dragged, and the arrows go on from there', () => {
    const made = letters({ rows })
    made.store.dispatch({ effects: made.current.go(1) })
    made.reordering.start(made.store, 1)
    made.reordering.dragOver(made.store, 4)
    made.reordering.drop(made.store)
    expect(made.current.positionIn(made.store.state)).toBe(4)
    press(made.store, 'ArrowDown')
    expect(made.current.positionIn(made.store.state)).toBe(5)
  })

  test('moves the active item a row with Alt and an arrow, and not past either end', () => {
    const made = letters({ rows })
    made.store.dispatch({ effects: made.current.go(0) })
    expect(press(made.store, 'ArrowDown', { alt: true })).toBe(true)
    expect([order(made.source), made.current.positionIn(made.store.state)]).toEqual(['bacdefghij', 1])
    press(made.store, 'ArrowUp', { alt: true })
    expect(press(made.store, 'ArrowUp', { alt: true })).toBe(true)
    expect([order(made.source), made.current.positionIn(made.store.state), made.moves.length]).toEqual([
      'abcdefghij',
      0,
      2,
    ])
  })

  test('puts a dragged row back on Escape, moving nothing', () => {
    const made = letters({ rows })
    made.reordering.start(made.store, 2)
    made.reordering.dragOver(made.store, 6)
    expect(press(made.store, 'Escape')).toBe(true)
    made.reordering.drop(made.store)
    expect([made.reordering.dragIn(made.store.state), made.moves.length, shifted(made)]).toEqual([undefined, 0, []])
    expect(press(made.store, 'Escape')).toBe(false)
  })
})

describe('reordering', () => {
  test('follows the dragged item as others are inserted before it, and ends the drag if it goes', () => {
    const made = letters()
    made.reordering.start(made.store, 2)
    made.reordering.dragOver(made.store, 4)
    made.source.insert(0, ['z'])
    expect(made.reordering.dragIn(made.store.state)).toEqual({ from: 3, over: 5 })
    made.source.remove(3, 4)
    expect(made.reordering.dragIn(made.store.state)).toBeUndefined()
  })

  test("keeps where it would land inside the list, and doesn't drop it where it was", () => {
    const made = letters()
    made.reordering.start(made.store, 2)
    made.reordering.dragOver(made.store, 99)
    expect(made.reordering.dragIn(made.store.state)).toEqual({ from: 2, over: 9 })
    made.reordering.dragOver(made.store, 2)
    made.reordering.drop(made.store)
    expect(made.moves).toEqual([])
  })

  test('takes the active item to where the move put it, when the list cannot place items by key', () => {
    const made = letters({ places: false })
    made.store.dispatch({ effects: made.current.go(5) })
    press(made.store, 'ArrowUp', { alt: true })
    expect([order(made.source), made.current.positionIn(made.store.state)]).toEqual(['abcdfeghij', 4])
  })

  test('takes the active item along once a move the app makes later is made', async () => {
    /** @type {PromiseWithResolvers<void>} */
    const answered = Promise.withResolvers()
    const made = letters({
      move: async (source, move) => {
        await answered.promise
        moveIn(source, move)
      },
    })
    made.store.dispatch({ effects: made.current.go(2) })
    press(made.store, 'ArrowDown', { alt: true })
    expect(made.current.positionIn(made.store.state)).toBe(2)
    answered.resolve()
    await Bun.sleep(0)
    expect([order(made.source), made.current.positionIn(made.store.state)]).toEqual(['abdcefghij', 3])
  })
})
