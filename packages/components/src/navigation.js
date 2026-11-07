/**
 * @import { ItemSource } from '@interact/core/source'
 * @import { Extension, State } from '@interact/core/state'
 * @import { ActiveItem } from './active-item.js'
 */

import { inputHandler, keyInput, move } from '@interact/core'

/**
 * How far a key moves the active item: some rows, some pages, or to the first or last item.
 * @typedef {Readonly<{ kind: 'by', rows: number, pages: number }> | Readonly<{ kind: 'first' } | { kind: 'last' }>} Step
 */

/** @type {ReadonlyMap<string, Step>} */
const STEPS = new Map([
  ['ArrowDown', { kind: 'by', pages: 0, rows: 1 }],
  ['ArrowUp', { kind: 'by', pages: 0, rows: -1 }],
  ['End', { kind: 'last' }],
  ['Home', { kind: 'first' }],
  ['PageDown', { kind: 'by', pages: 1, rows: 0 }],
  ['PageUp', { kind: 'by', pages: -1, rows: 0 }],
])

/** Rows a page key moves by when no extension says how many show. */
const PAGE = 10

/**
 * Where a move by rows and pages lands: from the active item, or the top shown while nothing is, by as many rows as a
 * page shows (as many as show, when an extension says which do, else `PAGE`).
 * @template T, R
 * @template {ItemSource<T>} S
 * @param {ActiveItem<T, R, S>} current - The list's active item
 * @param {State} state - The state
 * @param {Readonly<{ rows: number, pages: number }>} step - How far
 * @param {number} count - How many items there are
 * @returns {number | undefined} Where it lands, if anywhere
 */
function moved(current, state, step, count) {
  const shown = state.facet(current.list.visible)(state)
  const page = shown === undefined ? PAGE : Math.max(1, shown.end - shown.start)
  const by = step.rows + step.pages * page
  const from = current.positionIn(state) ?? shown?.start ?? 0
  return current.landing(state, move(from, by, count), by < 0 ? -1 : 1)
}

/**
 * Keyboard navigation, as the WAI-ARIA Authoring Practices listbox pattern has it: the arrows move the active item a
 * row, the page keys a page (as many rows as show, when an extension says which do, else ten), Home and End to the
 * first and last item, never onto an item focus passes over and never round the ends. Each move shows the item it
 * lands on (`reveal`), and says whether Shift was held. With the toggle modifier held, a key is left to others.
 * @template T, R
 * @template {ItemSource<T>} S
 * @param {ActiveItem<T, R, S>} current - The list's active item
 * @returns {Extension} The extension
 */
function navigation(current) {
  const { list } = current
  return [
    current,
    inputHandler.of((input, store) => {
      if (!input.is(keyInput) || input.value.toggle) {
        return false
      }
      const { key, shift } = input.value
      const step = STEPS.get(key)
      const { state } = store
      const count = list.listOf(state).count()
      if (step === undefined || count === 0) {
        return false
      }
      const to =
        step.kind === 'first'
          ? current.landing(state, 0, 1)
          : step.kind === 'last'
            ? current.landing(state, count - 1, -1)
            : moved(current, state, step, count)
      if (to !== undefined) {
        store.dispatch({ effects: current.go(to, { shift }) })
      }
      return true
    }),
  ]
}

export { navigation }
