/**
 * @import { ListPipeline } from '@interact/core/list-pipeline'
 * @import { Selection } from '@interact/core/selection'
 * @import { Source } from '@interact/core/source'
 * @import { TemplateResult } from '@interact/dom/template'
 * @import { Numbered, Range } from './test-helpers.js'
 */

import { describe, expect, test } from 'bun:test'

import { MemorySource, Store, controlled, listPipeline, nothing } from '@interact/core'
import { renderToString } from '@interact/dom'

import { active } from './active-item.js'
import { selection } from './list-selection.js'
import { TEN_BILLION, listboxOver, numbers, press } from './test-helpers.js'

const ROWS = 10
const FIVE_BILLION = 5_000_000_000

/**
 * A listbox over ten billion numbered items, ten rows showing, focused on the first without choosing it.
 * @param {'single' | 'multiple'} mode - How it selects
 * @returns {ReturnType<typeof listboxOver<Numbered, Range, Source<Numbered, Range>>> & Readonly<{ reads: () => number }>}
 *   The listbox, and how many items its source has read
 */
function tenBillion(mode) {
  const numbered = numbers(TEN_BILLION)
  const made = listboxOver(numbered.source, { mode, rows: ROWS })
  made.store.dispatch({ effects: made.current.go(0, { entering: true }) })
  return { ...made, reads: numbered.reads }
}

/**
 * Presses an item.
 * @param {ReturnType<typeof tenBillion>} made - The listbox
 * @param {number} position - The item
 * @param {Readonly<{ shift?: boolean, toggle?: boolean }>} [held] - What was held
 * @returns {void}
 */
function click({ list, store }, position, held = {}) {
  store.handle(list.press.of({ count: 1, position, shift: held.shift ?? false, toggle: held.toggle ?? false }))
}

/**
 * How many items are selected.
 * @param {ReturnType<typeof tenBillion>} made - The listbox
 * @returns {Promise<number>} The count
 */
async function count({ chosen, store }) {
  return chosen.count(store.state)
}

describe('selection in single mode', () => {
  test('follows the active item as it moves, in the same transaction', () => {
    const made = tenBillion('single')
    /** @type {number[]} */
    const transactions = []
    made.store.subscribe(() => {
      transactions.push(1)
    })
    press(made.store, 'ArrowDown')
    const markup = renderToString(made.list.render(made.store.state))
    expect(markup).toMatch(/id="listbox-1"[^>]*aria-selected="true"/u)
    expect(markup).toMatch(/id="listbox-0"[^>]*aria-selected="false"/u)
    expect(transactions).toHaveLength(1)
  })

  test('does not follow focus entering', async () => {
    expect(await count(tenBillion('single'))).toBe(0)
  })
})

describe('selection in multiple mode', () => {
  test('toggles with Space, extends with Shift and selects everything with the toggle modifier and A', async () => {
    const made = tenBillion('multiple')
    press(made.store, ' ')
    press(made.store, 'ArrowDown', { shift: true })
    press(made.store, 'ArrowDown', { shift: true })
    expect(await count(made)).toBe(3)
    press(made.store, 'a', { toggle: true })
    expect(await count(made)).toBe(TEN_BILLION)
  })

  test('of everything but one counts ten billion less one, reading only what shows', async () => {
    const made = tenBillion('multiple')
    press(made.store, 'a', { toggle: true })
    click(made, 2, { toggle: true })
    expect(await count(made)).toBe(TEN_BILLION - 1)
    expect(made.reads()).toBeLessThanOrEqual(ROWS * ROWS)
  })

  test('selects through from the anchor with Shift, either way round', async () => {
    const made = tenBillion('multiple')
    click(made, ROWS)
    click(made, 2, { shift: true })
    expect(await count(made)).toBe(ROWS - 2 + 1)
  })

  test('selects through from the anchor with Shift and Space', async () => {
    const made = tenBillion('multiple')
    click(made, 2)
    press(made.store, 'ArrowDown')
    press(made.store, 'ArrowDown')
    press(made.store, ' ', { shift: true })
    expect(await count(made)).toBe(3)
  })

  test('selects from the active item to the last or first, going there', async () => {
    const made = tenBillion('multiple')
    made.store.dispatch({ effects: made.current.go(FIVE_BILLION) })
    press(made.store, 'End', { shift: true, toggle: true })
    expect([made.current.positionIn(made.store.state), await count(made)]).toEqual([TEN_BILLION - 1, FIVE_BILLION])
    press(made.store, 'Home', { shift: true, toggle: true })
    expect([made.current.positionIn(made.store.state), await count(made)]).toEqual([0, TEN_BILLION])
  })

  test('says the list selects several', () => {
    const { list, store } = tenBillion('multiple')
    expect(list.containerAttributesOf(store.state)['aria-multiselectable']).toBe('true')
  })
})

describe('a selection the app owns', () => {
  test('changes only as the app says, which hears what was asked', async () => {
    /** @type {ListPipeline<Numbered, TemplateResult, Source<Numbered, Range>>} */
    const list = listPipeline(numbers(TEN_BILLION).source)
    const current = active(list)
    const chosen = selection(current, { mode: 'multiple' })
    /** @type {Selection<Range>[]} */
    const asked = []
    const owning = controlled(chosen.selected, (wanted) => {
      asked.push(wanted)
    })
    const store = new Store([chosen, owning])
    store.dispatch({ effects: current.go(0) })
    press(store, 'a', { toggle: true })
    expect([asked.length, await chosen.count(store.state)]).toEqual([1, 0])
    const [wanted = nothing()] = asked
    store.dispatch({ effects: chosen.selected.of(wanted), filter: false })
    expect(await chosen.count(store.state)).toBe(TEN_BILLION)
  })
})

describe('the source', () => {
  test('replaced, starts the selection over', async () => {
    const made = tenBillion('multiple')
    press(made.store, ' ')
    made.store.dispatch({ effects: made.list.setSource.of(numbers(ROWS).source) })
    expect(await count(made)).toBe(0)
  })

  test('changing in place, keeps what is selected', async () => {
    const source = new MemorySource(['a', 'b', 'c'], (item) => item)
    const made = listboxOver(source, { mode: 'multiple' })
    made.store.handle(made.list.press.of({ count: 1, position: 1, shift: false, toggle: false }))
    source.insert(0, ['z'])
    expect([await made.chosen.count(made.store.state), made.chosen.isSelected(made.store.state, 'b')]).toEqual([
      1,
      true,
    ])
  })
})
