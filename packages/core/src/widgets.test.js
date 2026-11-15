import { describe, expect, test } from 'bun:test'

import { deliver, start } from './compose.js'
import { dialog } from './dialog.js'
import { menu } from './menu.js'
import { reorderList } from './reorder.js'
import { select } from './select.js'
import { answer, click, keydown, pointer } from './test-inputs.js'

/** @import { MenuProps, MenuState } from './menu.js' */
/** @import { ReorderState } from './reorder.js' */
/** @import { ListProps } from './list.js' */

/** @type {MenuProps} */
const MENU = {
  items: [
    { disabled: false, key: 'cut', text: 'Cut' },
    { disabled: true, key: 'copy', text: 'Copy' },
    { disabled: false, key: 'paste', text: 'Paste' },
    { disabled: false, key: 'pin', text: 'Pin' },
  ],
  label: 'Edit',
}

/**
 * Steps a menu through inputs
 * @param {MenuState} state - The menu
 * @param {readonly Parameters<typeof menu.step>[1][]} inputs - The inputs
 * @returns {ReturnType<typeof menu.step>} The menu and the last step's effects
 */
function run(state, inputs) {
  /** @type {ReturnType<typeof menu.step>} */
  let result = [state, []]
  for (const input of inputs) {
    result = menu.step(result[0], input)
  }
  return result
}

describe('menu', () => {
  test('opens from the button with focus on the first item, moves with wrapping, and closes back to the button', () => {
    const closed = menu.init(MENU)
    let [state, effects] = run(closed, [click('button')])
    expect([state.open, effects]).toEqual([true, [{ item: 'cut', part: ['item'], type: 'focus' }]])
    ;[state, effects] = run(state, [keydown('item', 'ArrowUp', { item: 'cut' })])
    expect(effects).toEqual([{ type: 'preventDefault' }, { item: 'pin', part: ['item'], type: 'focus' }])
    ;[state, effects] = run(state, [keydown('item', 'Escape', { item: 'pin' })])
    expect([state.open, effects]).toEqual([
      false,
      [{ type: 'preventDefault' }, { item: null, part: ['button'], type: 'focus' }],
    ])
  })

  test('activates an item, but not a disabled one', () => {
    const [state] = run(menu.init(MENU), [click('button'), keydown('item', 'ArrowDown')])
    expect(state.active).toBe('copy')
    expect(run(state, [keydown('item', 'Enter')])[1]).toEqual([{ type: 'preventDefault' }])
    const [, effects] = run(state, [click('item', 'paste')])
    expect(effects).toEqual([
      { item: 'paste', type: 'activate' },
      { item: null, part: ['button'], type: 'focus' },
    ])
  })

  test('typeahead moves by what was typed, asks to be woken to forget it, and cycles on a repeated letter', () => {
    const [open] = run(menu.init(MENU), [click('button')])
    const [typed, effects] = run(open, [keydown('item', 'p', { timeStamp: 1000 })])
    expect(typed.active).toBe('paste')
    expect(effects.at(-1)).toEqual({ at: 1500, type: 'wake' })
    let [state] = run(typed, [keydown('item', 'i', { timeStamp: 1100 })])
    expect(state.active).toBe('pin')
    ;[state] = run(state, [{ now: 1600, type: 'time' }])
    expect(state.prefix).toBe('')
    ;[state] = run(state, [keydown('item', 'p', { timeStamp: 2000 }), keydown('item', 'p', { timeStamp: 2100 })])
    expect(state.active).toBe('pin')
  })
})

const fruitDialog = dialog(select, ['content', 'trigger'])
const ALL = ['apple', 'banana', 'cherry']
const DIALOG = {
  closeLabel: 'Close',
  content: { label: 'Fruit', placeholder: 'Choose', revision: 0, rows: 3 },
  open: true,
  title: 'Pick a fruit',
}

describe('dialog around a select', () => {
  test('focuses the part it was given when it opens', () => {
    const [, outs] = start(fruitDialog, DIALOG)
    expect(outs).toEqual([{ effect: { item: null, part: ['content', 'trigger'], type: 'focus' }, from: [] }])
  })

  test('closes on an Escape the select left alone, but not on one that closed the select', () => {
    const [first] = start(fruitDialog, DIALOG)
    const [, closedEscape] = deliver(fruitDialog, first, ['content'], keydown('trigger', 'Escape'))
    expect(closedEscape).toEqual([
      { effect: { type: 'preventDefault' }, from: [] },
      { effect: { type: 'change', value: false }, from: [] },
    ])

    const [opened, asks] = deliver(fruitDialog, first, ['content'], click('trigger'))
    expect(asks).toEqual([{ effect: { id: 1, ranks: [0, 4], type: 'ask' }, from: ['content', 'list'] }])
    const [loaded] = deliver(fruitDialog, opened, ['content', 'list'], answer(1, ALL, [0, 4]))
    const [, openEscape] = deliver(fruitDialog, loaded, ['content'], keydown('trigger', 'Escape'))
    expect(openEscape).toEqual([{ effect: { type: 'preventDefault' }, from: ['content'] }])
  })

  test("passes the select's change through to the app, from the select", () => {
    const [first] = start(fruitDialog, DIALOG)
    const [opened] = deliver(fruitDialog, first, ['content'], click('trigger'))
    const [loaded] = deliver(fruitDialog, opened, ['content', 'list'], answer(1, ALL, [0, 4]))
    const [, outs] = deliver(fruitDialog, loaded, ['content', 'list'], click('option', 'banana'))
    expect(outs).toEqual([{ effect: { type: 'change', value: 'banana' }, from: ['content'] }])
  })
})

const KEYS = ['a', 'b', 'c', 'd', 'e', 'f']
/** @type {ListProps} */
const REORDER = { focusable: true, label: 'Order', revision: 0, rows: 4, shown: true }

/**
 * A reorderable list, loaded
 * @returns {ReorderState} The list
 */
function loadedReorder() {
  const [asking] = reorderList.step(reorderList.init(REORDER), { props: REORDER, type: 'props' })
  return reorderList.step(asking, answer(1, KEYS, [0, 5]))[0]
}

describe('reorderable list', () => {
  test('a drag over a later option lands after it, emits move and an announcement, and swallows its click', () => {
    let [state] = reorderList.step(loadedReorder(), pointer('pointerdown', 'option', 'b', [10, 30]))
    ;[state] = reorderList.step(state, pointer('pointermove', 'option', 'b', [10, 32]))
    expect(state.drag.mode).toBe('pressed')
    ;[state] = reorderList.step(state, pointer('pointermove', 'option', 'b', [10, 40]))
    expect(state.drag.mode).toBe('dragging')
    ;[state] = reorderList.step(state, pointer('pointermove', 'option', 'd', [10, 70]))
    const option = reorderList.view(state, REORDER)['option']
    expect(typeof option === 'function' ? [option('b').data, option('d').data] : null).toEqual([
      { active: false, dragged: true, drop: null },
      { active: false, dragged: false, drop: 'after' },
    ])
    let effects
    ;[state, effects] = reorderList.step(state, pointer('pointerup', 'option', 'd', [10, 70]))
    expect(effects).toEqual([
      { after: true, item: 'b', target: 'd', type: 'move' },
      { message: { count: 6, item: 'b', position: 4, what: 'moved' }, type: 'announce', urgent: false },
    ])
    ;[state, effects] = reorderList.step(state, click('option', 'd'))
    expect([state.selected, effects]).toEqual([null, []])
  })

  test('a drag back over an earlier option lands before it; Escape cancels it', () => {
    let [state] = reorderList.step(loadedReorder(), pointer('pointerdown', 'option', 'c', [0, 50]))
    ;[state] = reorderList.step(state, pointer('pointermove', 'option', 'c', [0, 60]))
    ;[state] = reorderList.step(state, pointer('pointermove', 'option', 'a', [0, 10]))
    expect(state.drag).toMatchObject({ after: false, mode: 'dragging', over: 'a' })
    const [cancelled, effects] = reorderList.step(state, keydown('root', 'Escape'))
    expect([cancelled.drag, effects]).toEqual([
      { mode: 'idle' },
      [{ type: 'preventDefault' }, { message: { item: 'c', what: 'cancelled' }, type: 'announce', urgent: false }],
    ])
  })

  test('Alt+ArrowDown moves the active option one place, past the window edge too, as it holds the next key', () => {
    let [state] = reorderList.step(loadedReorder(), keydown('root', 'End'))
    ;[state] = reorderList.step(state, answer(2, KEYS, [1, 6]))
    ;[state] = reorderList.step(state, keydown('root', 'ArrowUp'))
    expect([state.active, state.top]).toEqual(['e', 2])
    const [moved, effects] = reorderList.step(state, keydown('root', 'ArrowDown', { altKey: true }))
    expect(effects.slice(0, 2)).toEqual([
      { type: 'preventDefault' },
      { after: true, item: 'e', target: 'f', type: 'move' },
    ])
    expect([moved.active, moved.activeRank]).toEqual(['e', 5])
    const [given] = reorderList.step(moved, { props: { ...REORDER, revision: 1 }, type: 'props' })
    const [after] = reorderList.step(given, answer(given.asked, ['a', 'b', 'c', 'd', 'f', 'e'], [1, 6]))
    expect([after.active, after.activeRank]).toEqual(['e', 5])
  })

  test('a press that never travels is a click, which chooses', () => {
    let [state] = reorderList.step(loadedReorder(), pointer('pointerdown', 'option', 'c', [0, 50]))
    ;[state] = reorderList.step(state, pointer('pointerup', 'option', 'c', [0, 50]))
    const [chosen, effects] = reorderList.step(state, click('option', 'c'))
    expect([chosen.selected, effects]).toEqual(['c', [{ type: 'change', value: 'c' }]])
  })
})
