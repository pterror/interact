/**
 * @import { ListPipeline, RenderRow, Rows } from '@interact/core/list-pipeline'
 * @import { Source } from '@interact/core/source'
 * @import { Numbered, Range } from './test-helpers.js'
 */

import { describe, expect, test } from 'bun:test'

import { Store, listPipeline } from '@interact/core'

import { TEN_BILLION, listboxOver, numbers } from './test-helpers.js'
import { UNMEASURED_ROWS } from './virtual-rows.js'
import { windowing } from './windowing.js'

const ROWS = 10
const OVERSCAN = 5
const FIVE_BILLION = 5_000_000_000

/**
 * A windowed listbox over ten billion numbered items.
 * @returns {ReturnType<typeof listboxOver<Numbered, Range, Source<Numbered, Range>>>} The listbox
 */
function tenBillion() {
  return listboxOver(numbers(TEN_BILLION).source, { mode: 'multiple', rows: ROWS })
}

/**
 * The rows as plain values.
 * @param {Rows} rows - The rows
 * @returns {(number | string)[]} Each item row's position, and each gap as "from-to"
 */
function plain(rows) {
  /** @type {(number | string)[]} */
  const seen = []
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows.at(index)
    if (row !== undefined) {
      seen.push(row.kind === 'item' ? row.position : `${String(row.from)}-${String(row.to)}`)
    }
  }
  return seen
}

/**
 * Scrolls a listbox to a position.
 * @param {ReturnType<typeof tenBillion>} made - The listbox
 * @param {number} position - Where to
 * @returns {void}
 */
function scrollTo({ store, windowed }, position) {
  if (windowed !== undefined) {
    store.dispatch({ effects: windowed.scrollTo.of(position) })
  }
}

describe('windowing', () => {
  test('renders the rows showing and a few either side, ten billion items in, and a gap for the rest', () => {
    const made = tenBillion()
    scrollTo(made, FIVE_BILLION)
    const rows = plain(made.list.rowsIn(made.store.state))
    expect(rows.length).toBe(ROWS + OVERSCAN + OVERSCAN + 2)
    expect([rows.at(0), rows.at(1), rows.at(-2), rows.at(-1)]).toEqual([
      `0-${String(FIVE_BILLION - OVERSCAN)}`,
      FIVE_BILLION - OVERSCAN,
      FIVE_BILLION + ROWS + OVERSCAN - 1,
      `${String(FIVE_BILLION + ROWS + OVERSCAN)}-${String(TEN_BILLION)}`,
    ])
  })

  test('keeps the active item rendered when it is scrolled away, hidden but present', () => {
    const made = tenBillion()
    made.store.dispatch({ effects: made.current.go(2) })
    scrollTo(made, FIVE_BILLION)
    expect(plain(made.list.rowsIn(made.store.state)).at(-2)).toBe(2)
    /** @type {RenderRow<Numbered>} */
    const row = { item: { id: 2 }, key: 2, kind: 'item', position: 2 }
    expect(made.list.attributesOf(row, made.store.state)['data-offscreen']).toBe(true)
  })

  test('scrolls no further than shows the last item in the last row', () => {
    const made = tenBillion()
    scrollTo(made, TEN_BILLION)
    expect(made.windowed?.placementIn(made.store.state).top).toBe(TEN_BILLION - ROWS)
  })

  test('sizes its gaps in the scrollable rows, which stay under the cap however long the list', () => {
    const made = tenBillion()
    scrollTo(made, FIVE_BILLION)
    const { state } = made.store
    /** @type {number[]} */
    const sizes = []
    const rows = made.list.rowsIn(state)
    for (const index of [0, rows.length - 1]) {
      const row = rows.at(index)
      if (row?.kind === 'gap') {
        const style = String(made.list.attributesOf({ ...row, key: 'gap' }, state)['style'])
        sizes.push(Number(/--interact-gap-rows: (?<rows>\d+)/u.exec(style)?.groups?.['rows']))
      }
    }
    expect(sizes.reduce((all, size) => all + size, ROWS + OVERSCAN + OVERSCAN)).toBe(UNMEASURED_ROWS)
  })

  test('says which positions show, and that it shows revealed items itself', () => {
    const made = tenBillion()
    scrollTo(made, FIVE_BILLION)
    const { state } = made.store
    expect(state.facet(made.list.visible)(state)).toEqual({ end: FIVE_BILLION + ROWS, start: FIVE_BILLION })
    expect(state.facet(made.list.reveals)).toBe(true)
  })

  test('keeps the top where it was, as far as the items of a new source reach', () => {
    const made = tenBillion()
    scrollTo(made, FIVE_BILLION)
    made.store.dispatch({ effects: made.list.setSource.of(numbers(ROWS + ROWS).source) })
    expect(made.windowed?.placementIn(made.store.state).top).toBe(ROWS)
  })
})

/**
 * How many rows a windowed list over some items says it shows.
 * @param {number} count - How many items it has
 * @param {boolean} shrink - Whether it shrinks to them
 * @returns {string | number | boolean | undefined} Its style
 */
function shownRows(count, shrink) {
  /** @type {ListPipeline<Numbered, string, Source<Numbered, Range>>} */
  const list = listPipeline(numbers(count).source)
  const store = new Store([windowing(list, { rows: ROWS, shrink })])
  return list.containerAttributesOf(store.state)['style']
}

describe('windowing that shrinks', () => {
  test('shows as many rows as a short list has, as many as it is told for a long one, and always so without it', () => {
    const SHORT = 3
    const LONG = 40
    expect([shownRows(SHORT, true), shownRows(LONG, true), shownRows(SHORT, false)]).toEqual([
      '--interact-visible-rows: 3',
      '--interact-visible-rows: 10',
      '--interact-visible-rows: 10',
    ])
  })
})
