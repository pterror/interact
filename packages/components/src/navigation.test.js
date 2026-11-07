/**
 * @import { ListPipeline } from '@interact/core/list-pipeline'
 * @import { TemplateResult } from '@interact/dom/template'
 */

import { describe, expect, test } from 'bun:test'

import { MemorySource, Store, listPipeline } from '@interact/core'

import { active } from './active-item.js'
import { navigation } from './navigation.js'
import { TEN_BILLION, listboxOver, numbers, press } from './test-helpers.js'

const ROWS = 10
const SEPARATOR = '—'

/** @typedef {Readonly<{ id: number, label: string }>} Labelled */

/**
 * A list of ten billion numbered items, ten rows showing, focused on the first.
 * @returns {ReturnType<typeof listboxOver<import('./test-helpers.js').Numbered, import('./test-helpers.js').Range,
 *   import('@interact/core/source').Source<import('./test-helpers.js').Numbered, import('./test-helpers.js').Range>>>}
 *   The listbox
 */
function tenBillion() {
  const made = listboxOver(numbers(TEN_BILLION).source, { rows: ROWS })
  press(made.store, 'Home')
  return made
}

/**
 * Where the active item and the top are.
 * @param {ReturnType<typeof tenBillion>} made - The listbox
 * @returns {(number | undefined)[]} The active position and the top
 */
function where({ current, store, windowed }) {
  return [current.positionIn(store.state), windowed?.placementIn(store.state).top]
}

describe('keyboard navigation', () => {
  test('moves the active item a row at a time, the list scrolling just enough to show it', () => {
    const made = tenBillion()
    for (let step = 0; step < ROWS; step += 1) {
      press(made.store, 'ArrowDown')
    }
    expect(where(made)).toEqual([ROWS, 1])
  })

  test('goes to either end, ten billion items apart', () => {
    const made = tenBillion()
    press(made.store, 'End')
    expect(where(made)).toEqual([TEN_BILLION - 1, TEN_BILLION - ROWS])
    press(made.store, 'Home')
    expect(where(made)).toEqual([0, 0])
  })

  test('moves a page at a time by as many rows as show, never past the ends', () => {
    const made = tenBillion()
    press(made.store, 'PageDown')
    expect(where(made)).toEqual([ROWS, 1])
    press(made.store, 'PageUp')
    press(made.store, 'PageUp')
    expect(where(made)).toEqual([0, 0])
  })

  test('leaves keys with the toggle modifier to others', () => {
    const made = tenBillion()
    expect(press(made.store, 'ArrowDown', { toggle: true })).toBe(false)
  })
})

describe('keyboard navigation in a list whose separators focus passes over', () => {
  test('steps over them with the arrows, Home and End, without going round', () => {
    const labels = ['Cut', SEPARATOR, 'Copy', 'Paste', SEPARATOR, 'Undo', SEPARATOR]
    /** @type {readonly Labelled[]} */
    const items = labels.map((label, id) => ({ id, label }))
    /** @type {ListPipeline<Labelled, TemplateResult, MemorySource<Labelled>>} */
    const list = listPipeline(new MemorySource(items, (item) => item.id))
    const current = active(list)
    const store = new Store([navigation(current), current.skip.of((item) => item.label === SEPARATOR)])
    const keys = ['Home', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'End', 'ArrowDown', 'Home', 'ArrowUp']
    const seen = keys.map((key) => {
      press(store, key)
      return current.positionIn(store.state)
    })
    expect(seen).toEqual([0, 2, 3, 5, 5, 5, 0, 0])
  })
})
