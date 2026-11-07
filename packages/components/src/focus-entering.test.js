/**
 * @import { Source } from '@interact/core/source'
 * @import { Numbered, Range } from './test-helpers.js'
 */

import { describe, expect, test } from 'bun:test'

import { MemorySource, spanning, toggle } from '@interact/core'
import { render } from '@interact/dom'

import { listboxView } from './listbox-view.js'
import { TEN_BILLION, listboxOver, numbers, press } from './test-helpers.js'

const ROWS = 10
const FIVE_BILLION = 5_000_000_000
const SEPARATOR = '—'

/**
 * A listbox in the page, its view plugins running.
 * @template T, F
 * @template {Source<T, F>} S
 * @param {ReturnType<typeof listboxOver<T, F, S>>} made - The listbox
 * @returns {() => void} Moves focus into it
 */
function shown(made) {
  const view = listboxView()
  const root = document.createElement('div')
  document.body.append(root)
  const draw = () => {
    render(view.render(made.store), root)
    view.rendered?.(made.store, root, () => undefined)
  }
  draw()
  made.store.subscribe(draw)
  return () => {
    root.querySelector('[role="listbox"]')?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
  }
}

/**
 * A windowed listbox over ten billion numbered items whose source can place them, or not, in the page.
 * @param {boolean} places - Whether the source can place items
 * @returns {Readonly<{ made: ReturnType<typeof listboxOver<Numbered, Range, Source<Numbered, Range>>>, focus: () => void }>}
 *   The listbox, and a way to move focus into it
 */
function tenBillion(places) {
  const made = listboxOver(numbers(TEN_BILLION, places).source, { mode: 'multiple', rows: ROWS })
  return { focus: shown(made), made }
}

/**
 * Has the app select ten items from five billion on, then deselect the first of them.
 * @param {ReturnType<typeof tenBillion>['made']} made - The listbox
 * @returns {void}
 */
function selectFromFiveBillion({ chosen, list, store }) {
  const source = store.state.field(list.source)
  const span = spanning(source, FIVE_BILLION, FIVE_BILLION + ROWS)
  store.dispatch({ effects: chosen.selected.of(toggle(span, source, { id: FIVE_BILLION })) })
}

/**
 * Where the active item is, and whether it shows.
 * @param {ReturnType<typeof tenBillion>['made']} made - The listbox
 * @returns {Readonly<{ active: number | undefined, shows: boolean }>} Where it is
 */
function where({ current, list, store }) {
  const at = current.positionIn(store.state)
  const visible = store.state.facet(list.visible)(store.state)
  return { active: at, shows: at !== undefined && visible !== undefined && at >= visible.start && at < visible.end }
}

describe('focus entering a listbox with nothing active', () => {
  test('goes to the first selected item, and shows it, when the source can place items', async () => {
    const { focus, made } = tenBillion(true)
    selectFromFiveBillion(made)
    focus()
    await Bun.sleep(0)
    expect(where(made)).toEqual({ active: FIVE_BILLION + 1, shows: true })
  })

  test('goes to the top item when the source cannot place items', async () => {
    const { focus, made } = tenBillion(false)
    selectFromFiveBillion(made)
    focus()
    expect(where(made).active).toBe(0)
    await Bun.sleep(0)
    expect(where(made).active).toBe(0)
  })

  test('goes to the top item at once when nothing is selected', () => {
    const { focus, made } = tenBillion(true)
    if (made.windowed !== undefined) {
      made.store.dispatch({ effects: made.windowed.scrollTo.of(2) })
    }
    focus()
    expect(where(made).active).toBe(2)
  })

  test('drops an answer that comes after a key made an item active', async () => {
    const { focus, made } = tenBillion(true)
    selectFromFiveBillion(made)
    focus()
    press(made.store, 'ArrowDown')
    await Bun.sleep(0)
    expect(where(made).active).toBe(1)
  })

  test('goes to the item last chosen when the source cannot say where the selection starts', () => {
    const { focus, made } = tenBillion(false)
    made.store.handle(made.list.press.of({ count: 1, position: 4, shift: false, toggle: false }))
    made.store.dispatch({ effects: made.current.moved.of({ entering: false, shift: false, to: undefined }) })
    focus()
    expect(where(made).active).toBe(4)
  })

  test('passes over an item focus passes over at the top', () => {
    const labels = [SEPARATOR, 'Cut', 'Copy']
    const made = listboxOver(new MemorySource(labels, (item) => item), { skip: (item) => item === SEPARATOR })
    shown(made)()
    expect(made.current.positionIn(made.store.state)).toBe(1)
  })
})

describe('focus entering a listbox with an item active', () => {
  test('brings it back into view when it was scrolled away', () => {
    const { focus, made } = tenBillion(true)
    made.store.dispatch({ effects: made.current.go(3) })
    if (made.windowed !== undefined) {
      made.store.dispatch({ effects: made.windowed.scrollTo.of(FIVE_BILLION) })
    }
    focus()
    expect(made.windowed?.placementIn(made.store.state).top).toBe(3)
  })
})
