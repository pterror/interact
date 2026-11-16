import { describe, expect, test } from 'bun:test'

import { compose, deliver, resolve, start } from './compose.js'
import { part } from './contract.js'
import { dialog } from './dialog.js'
import { menu } from './menu.js'
import { reorderList } from './reorder.js'
import { select } from './select.js'
import { answer, click, keydown, pointer } from './test-inputs.js'

/** @import { MenuProps, MenuState } from './menu.js' */
/** @import { ReorderProps, ReorderState } from './reorder.js' */

/** @type {MenuProps} */
const MENU = { disabled: ['copy'], label: 'Edit', source: 'edit' }
const EDIT = ['cut', 'copy', 'paste', 'pin']

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

/**
 * A menu with its items answered
 * @returns {MenuState} The menu
 */
function withItems() {
  return run(menu.init(MENU)[0], [answer(1, EDIT, [0, 64])])[0]
}

/**
 * The host's answer to a find over the menu's items, as `arraySource` finds
 * @param {number} id - The find's id
 * @param {string | null} key - The key found
 * @returns {import('./contract.js').Found} The answer
 */
function found(id, key) {
  return { id, key, type: 'found' }
}

describe('menu', () => {
  test('asks for its items whole: a first page, then the rest once it knows how many', () => {
    const [first, asks] = menu.init(MENU)
    expect(asks).toEqual([{ id: 1, ranks: [0, 64], source: 'edit', type: 'ask' }])
    const many = Array.from({ length: 70 }, (_, index) => `k${String(index)}`)
    const [, more] = run(first, [answer(1, many, [0, 64])])
    expect(more).toEqual([{ id: 2, ranks: [0, 70], source: 'edit', type: 'ask' }])
  })

  test('opens from the button with focus on the first item, moves with wrapping, and closes back to the button', () => {
    let [state, effects] = run(withItems(), [click('button')])
    expect([state.open, effects]).toEqual([true, [{ item: 'cut', part: ['item'], type: 'focus' }]])
    ;[state, effects] = run(state, [keydown('item', 'ArrowUp', { item: 'cut' })])
    expect(effects).toEqual([{ type: 'preventDefault' }, { item: 'pin', part: ['item'], type: 'focus' }])
    ;[state, effects] = run(state, [keydown('item', 'Escape', { item: 'pin' })])
    expect([state.open, effects]).toEqual([
      false,
      [{ type: 'preventDefault' }, { item: null, part: ['button'], type: 'focus' }],
    ])
  })

  test('opened before its items come, focuses the first once they do', () => {
    const [open, none] = run(menu.init(MENU)[0], [click('button')])
    expect([open.open, none]).toEqual([true, []])
    const [, effects] = run(open, [answer(1, EDIT, [0, 64])])
    expect(effects).toEqual([{ item: 'cut', part: ['item'], type: 'focus' }])
  })

  test('activates an item, but not a disabled one', () => {
    const [state] = run(withItems(), [click('button'), keydown('item', 'ArrowDown')])
    expect(state.active).toBe('copy')
    expect(run(state, [keydown('item', 'Enter')])[1]).toEqual([{ type: 'preventDefault' }])
    const [, effects] = run(state, [click('item', 'paste')])
    expect(effects).toEqual([
      { item: 'paste', type: 'activate' },
      { item: null, part: ['button'], type: 'focus' },
    ])
  })

  test('typeahead asks the host to find what was typed, takes the latest answer, and forgets it when woken', () => {
    const [open] = run(withItems(), [click('button')])
    const [typed, effects] = run(open, [keydown('item', 'p', { timeStamp: 1000 })])
    expect(effects).toEqual([
      { type: 'preventDefault' },
      { at: 'cut', find: 'p', id: 1, next: true, source: 'edit', type: 'ask' },
      { at: 1500, type: 'wake' },
    ])
    const [more, again] = run(typed, [keydown('item', 'i', { timeStamp: 1100 })])
    expect(again[1]).toEqual({ at: 'cut', find: 'pi', id: 2, next: false, source: 'edit', type: 'ask' })
    let [state] = run(more, [found(1, 'paste'), found(2, 'pin')])
    expect(state.active).toBe('pin')
    ;[state] = run(state, [{ now: 1600, type: 'time' }])
    expect(state.prefix).toBe('')
    const [, cycled] = run(state, [
      keydown('item', 'p', { timeStamp: 2000 }),
      keydown('item', 'p', { timeStamp: 2100 }),
    ])
    expect(cycled[1]).toEqual({ at: 'pin', find: 'p', id: 4, next: true, source: 'edit', type: 'ask' })
  })
})

const fruitDialog = dialog(select, ['content', 'trigger'])
const ALL = ['apple', 'banana', 'cherry']
const DIALOG = {
  closeLabel: 'Close',
  ignoreOutside: false,
  content: { label: 'Fruit', placeholder: 'Choose', rows: 3, source: 'fruit', value: null },
  open: true,
  title: 'Pick a fruit',
}

describe('dialog around a select', () => {
  test('focuses the part it was given when it opens', () => {
    const [, outs] = start(fruitDialog, DIALOG)
    expect(outs).toEqual([{ effect: { item: null, part: ['content', 'trigger'], type: 'focus' }, from: [] }])
  })

  test('closes on an Escape the select left alone, at once and pending, but not on one that closed the select', () => {
    const [first] = start(fruitDialog, DIALOG)
    const [closed, closedEscape] = deliver(fruitDialog, first, ['content'], keydown('trigger', 'Escape'))
    expect(closedEscape).toEqual([
      { effect: { type: 'preventDefault' }, from: [] },
      { effect: { id: 1, type: 'change', value: false }, from: [] },
    ])
    const [refused, focus] = deliver(fruitDialog, closed, [], { id: 1, type: 'refused' })
    expect(resolve(fruitDialog, closed, DIALOG).hidden).toBe(true)
    expect([focus, resolve(fruitDialog, refused, DIALOG).hidden]).toEqual([
      [{ effect: { item: null, part: ['content', 'trigger'], type: 'focus' }, from: [] }],
      false,
    ])

    const [opened, asks] = deliver(fruitDialog, first, ['content'], click('trigger'))
    expect(asks).toEqual([
      { effect: { id: 1, ranks: [0, 4], source: 'fruit', type: 'ask' }, from: ['content', 'list'] },
    ])
    const [loaded] = deliver(fruitDialog, opened, ['content', 'list'], answer(1, ALL, [0, 4]))
    const [, openEscape] = deliver(fruitDialog, loaded, ['content'], keydown('trigger', 'Escape'))
    expect(openEscape).toEqual([{ effect: { type: 'preventDefault' }, from: ['content'] }])
  })

  test("passes the select's change through to the app, from the select", () => {
    const [first] = start(fruitDialog, DIALOG)
    const [opened] = deliver(fruitDialog, first, ['content'], click('trigger'))
    const [loaded] = deliver(fruitDialog, opened, ['content', 'list'], answer(1, ALL, [0, 4]))
    const [, outs] = deliver(fruitDialog, loaded, ['content', 'list'], click('option', 'banana'))
    expect(outs).toEqual([{ effect: { id: 1, type: 'change', value: 'banana' }, from: ['content'] }])
  })
})

describe('effects bubbling through on handlers', () => {
  const around = compose({
    children: { picker: fruitDialog },
    init: (/** @type {Readonly<{ open: boolean }>} */ props) => [{ heard: 0, open: props.open }, []],
    on: {
      picker: {
        change: (own, effect, from) => [
          { ...own, heard: own.heard + 1, open: from.length === 0 ? effect.value === true : own.open },
          [],
        ],
      },
    },
    props: { picker: (own) => ({ ...DIALOG, open: own.open }) },
    step: (own, /** @type {Readonly<{ type: 'props', props: Readonly<{ open: boolean }> }>} */ input) => [
      { ...own, open: input.props.open },
      [],
    ],
    view: () => ({ root: part({ content: [{ child: 'picker' }] }) }),
  })

  test('go on up after a handler that hears them, unless it stops them, told where they came from', () => {
    const [first] = start(around, { open: true })
    const [, outs] = deliver(around, first, ['picker', 'content'], keydown('trigger', 'Escape'))
    expect(outs).toEqual([
      { effect: { type: 'preventDefault' }, from: ['picker'] },
      { effect: { id: 1, type: 'change', value: false }, from: ['picker'] },
    ])
  })
})

const KEYS = ['a', 'b', 'c', 'd', 'e', 'f']
/** @type {ReorderProps} */
const REORDER = {
  dragDistance: 4,
  focusable: true,
  hover: false,
  keyshortcuts: 'Alt+ArrowUp Alt+ArrowDown',
  label: 'Order',
  rows: 4,
  selected: null,
  shown: true,
  source: 'order',
}

/**
 * A reorderable list, loaded
 * @returns {ReorderState} The list
 */
function loadedReorder() {
  const [asking] = reorderList.init(REORDER)
  return reorderList.step(asking, answer(1, KEYS, [0, 5]))[0]
}

/**
 * The keys a reorderable list draws
 * @param {ReorderState} state - The list
 * @returns {readonly unknown[]} The keys
 */
function drawn(state) {
  const root = reorderList.view(state, REORDER)['root']
  const [each] = root === undefined || typeof root === 'function' ? [] : root.content
  return each !== undefined && 'keys' in each ? each.keys : []
}

describe('reorderable list', () => {
  test('a drag over a later option lands after it, shows at once, emits move and an announcement, and swallows its click', () => {
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
      { after: true, id: 1, item: 'b', source: 'order', target: 'd', type: 'move' },
      { message: 'moved', type: 'announce', urgent: false, values: { count: 6, item: 'b', position: 4 } },
      { item: 'b', type: 'active' },
    ])
    expect(drawn(state)).toEqual(['a', 'c', 'd', 'b'])
    ;[state, effects] = reorderList.step(state, click('option', 'd'))
    expect([state.selection.app, effects]).toEqual([null, []])
  })

  test('a drag back over an earlier option lands before it; Escape cancels it', () => {
    let [state] = reorderList.step(loadedReorder(), pointer('pointerdown', 'option', 'c', [0, 50]))
    ;[state] = reorderList.step(state, pointer('pointermove', 'option', 'c', [0, 60]))
    ;[state] = reorderList.step(state, pointer('pointermove', 'option', 'a', [0, 10]))
    expect(state.drag).toMatchObject({ after: false, mode: 'dragging', over: 'a' })
    const [cancelled, effects] = reorderList.step(state, keydown('root', 'Escape'))
    expect([cancelled.drag, effects]).toEqual([
      { mode: 'idle' },
      [{ type: 'preventDefault' }, { message: 'cancelled', type: 'announce', urgent: false, values: { item: 'c' } }],
    ])
  })

  test('a press travels the distance its props give before it drags', () => {
    const far = { ...REORDER, dragDistance: 20 }
    let [state] = reorderList.step(reorderList.init(far)[0], { props: far, type: 'props' })
    ;[state] = reorderList.step(state, answer(state.asked, KEYS, [0, 5]))
    ;[state] = reorderList.step(state, pointer('pointerdown', 'option', 'b', [0, 0]))
    ;[state] = reorderList.step(state, pointer('pointermove', 'option', 'b', [0, 10]))
    expect(state.drag.mode).toBe('pressed')
  })

  test('quick moves each go against the order shown, pending moves included, before the host has any', () => {
    let [state] = reorderList.step(loadedReorder(), keydown('root', 'ArrowDown'))
    /** @type {readonly unknown[]} */
    let effects
    ;[state, effects] = reorderList.step(state, keydown('root', 'ArrowDown', { altKey: true }))
    expect(effects[1]).toEqual({ after: true, id: 1, item: 'a', source: 'order', target: 'b', type: 'move' })
    ;[state, effects] = reorderList.step(state, keydown('root', 'ArrowDown', { altKey: true }))
    expect(effects[1]).toEqual({ after: true, id: 2, item: 'a', source: 'order', target: 'c', type: 'move' })
    expect([drawn(state), state.active, state.activeRank]).toEqual([['b', 'c', 'a', 'd'], 'a', 2])
  })

  test('a confirmed move goes once an answer asked after it holds it; a refused one is undone and announced', () => {
    let [state] = reorderList.step(loadedReorder(), keydown('root', 'ArrowDown'))
    ;[state] = reorderList.step(state, keydown('root', 'ArrowDown', { altKey: true }))
    ;[state] = reorderList.step(state, keydown('root', 'ArrowDown', { altKey: true }))
    ;[state] = reorderList.step(state, { id: 1, type: 'confirmed' })
    ;[state] = reorderList.step(state, { type: 'changed' })
    ;[state] = reorderList.step(state, answer(state.asked, ['b', 'a', 'c', 'd', 'e', 'f'], [0, 5]))
    expect([state.moves.map((move) => move.id), drawn(state)]).toEqual([[2], ['b', 'c', 'a', 'd']])
    const [refused, effects] = reorderList.step(state, { id: 2, type: 'refused' })
    expect([drawn(refused), refused.active, refused.activeRank]).toEqual([['b', 'a', 'c', 'd'], 'a', 1])
    expect(effects).toEqual([{ message: 'refused', type: 'announce', urgent: false, values: { item: 'a' } }])
  })

  test('a press that never travels is a click, which chooses', () => {
    let [state] = reorderList.step(loadedReorder(), pointer('pointerdown', 'option', 'c', [0, 50]))
    ;[state] = reorderList.step(state, pointer('pointerup', 'option', 'c', [0, 50]))
    const [chosen, effects] = reorderList.step(state, click('option', 'c'))
    expect([chosen.selection.app, effects]).toEqual([
      'c',
      [
        { id: 1, type: 'change', value: 'c' },
        { item: 'c', type: 'active' },
      ],
    ])
  })
})
