import { describe, expect, test } from 'bun:test'

import { deliver, resolve, start } from './compose.js'
import { select } from './select.js'
import { answer, click, keydown } from './test-inputs.js'

/** @import { Out } from './compose.js' */
/** @import { SelectProps, SelectState } from './select.js' */

const ALL = ['apple', 'banana', 'cherry', 'date', 'elderberry', 'fig', 'grape']

/** @type {SelectProps} */
const PROPS = { label: 'Fruit', placeholder: 'Choose', revision: 0, rows: 4 }

/**
 * Delivers an input, checking the state is still a select's
 * @param {SelectState} state - The select
 * @param {readonly string[]} path - The widget it is for
 * @param {unknown} input - The input
 * @returns {readonly [SelectState, readonly Out[]]} The select and the effects that reach the host
 */
function send(state, path, input) {
  const [next, outs] = deliver(select, state, path, input)
  return [isSelect(next) ? next : state, outs]
}

/**
 * Whether a value is a select's state
 * @param {unknown} value - The value
 * @returns {value is SelectState} Whether it has a select's fields
 */
function isSelect(value) {
  return typeof value === 'object' && value !== null && 'open' in value && 'list' in value
}

/**
 * A select started and opened, its list's ask answered
 * @param {SelectProps} props - Its props
 * @returns {SelectState} The select
 */
function opened(props = PROPS) {
  const [first] = start(select, props)
  const [state] = send(isSelect(first) ? first : select.init(props), [], click('trigger'))
  return send(state, ['list'], answer(state.list.asked, ALL, [0, 5]))[0]
}

describe('select', () => {
  test('starts closed, asking for nothing until it opens; opening asks its list, which answers back to the list', () => {
    const [first, outs] = start(select, PROPS)
    expect(outs).toEqual([])
    const [state, effects] = send(isSelect(first) ? first : select.init(PROPS), [], keydown('trigger', 'ArrowDown'))
    expect(effects).toEqual([
      { effect: { type: 'preventDefault' }, from: [] },
      { effect: { id: 1, ranks: [0, 5], type: 'ask' }, from: ['list'] },
    ])
    const [answered] = send(state, ['list'], answer(1, ALL, [0, 5]))
    expect(answered.list.keys).toEqual(ALL.slice(0, 5))
  })

  test("moves through the list from the trigger, naming the active option in the trigger's aria-activedescendant", () => {
    let [state] = send(opened(), [], keydown('trigger', 'ArrowDown'))
    ;[state] = send(state, [], keydown('trigger', 'ArrowDown'))
    const tree = resolve(select, state, PROPS)
    const [trigger] = tree.content
    expect(trigger !== undefined && 'aria' in trigger ? trigger.aria['activedescendant'] : null).toEqual({
      item: 'banana',
      owner: ['list'],
      part: 'option',
    })
  })

  test('chooses with Enter, keeping its own value when not given one', () => {
    const [moved] = send(opened(), [], keydown('trigger', 'ArrowDown'))
    const [state, effects] = send(moved, [], keydown('trigger', 'Enter'))
    expect([state.open, state.value]).toEqual([false, 'apple'])
    expect(effects).toEqual([
      { effect: { type: 'preventDefault' }, from: [] },
      { effect: { type: 'change', value: 'apple' }, from: [] },
    ])
  })

  test('with a value given, only emits change, and its list is given the new value when the props change', () => {
    const props = { ...PROPS, value: 'cherry' }
    const [first] = start(select, props)
    let [state, effects] = send(isSelect(first) ? first : select.init(props), [], click('trigger'))
    expect(effects).toEqual([{ effect: { id: 1, locate: 'cherry', rows: 6, type: 'ask' }, from: ['list'] }])
    ;[state] = send(state, ['list'], answer(1, ALL, [0, 6]))
    expect(state.list.active).toBe('cherry')
    ;[state, effects] = send(state, ['list'], click('option', 'fig'))
    expect([state.open, state.value, state.list.selected]).toEqual([false, 'cherry', 'cherry'])
    expect(effects).toEqual([{ effect: { type: 'change', value: 'fig' }, from: [] }])
    ;[state] = send(state, [], { props: { ...props, value: 'fig' }, type: 'props' })
    expect([state.value, state.list.selected]).toEqual(['fig', 'fig'])
  })

  test('captures a press in its list to keep focus on the trigger, and closes on a click in it after the list', () => {
    const state = opened()
    const [, effects] = send(state, ['list'], {
      button: 0,
      item: 'apple',
      part: 'option',
      timeStamp: 0,
      type: 'mousedown',
    })
    expect(effects).toEqual([{ effect: { type: 'preventDefault' }, from: [] }])
    const [after] = send({ ...state, value: 'apple' }, ['list'], click('option', 'apple'))
    expect(after.open).toBe(false)
  })

  test('closes on Escape without choosing, and on blur choosing the active option', () => {
    const [moved] = send(opened(), [], keydown('trigger', 'ArrowDown'))
    const [escaped] = send(moved, [], keydown('trigger', 'Escape'))
    expect([escaped.open, escaped.value]).toEqual([false, null])
    const [blurred] = send(moved, [], { item: null, part: 'trigger', timeStamp: 0, type: 'blur' })
    expect([blurred.open, blurred.value]).toEqual([false, 'apple'])
  })

  test('opens on Home and End, handing the key to the list once it is shown', () => {
    const [first] = start(select, PROPS)
    let [state, effects] = send(isSelect(first) ? first : select.init(PROPS), [], keydown('trigger', 'End'))
    expect(effects.map((out) => out.effect)).toEqual([
      { type: 'preventDefault' },
      { id: 1, ranks: [0, 5], type: 'ask' },
      { type: 'preventDefault' },
    ])
    ;[state, effects] = send(state, ['list'], answer(1, ALL, [0, 5]))
    expect(effects).toEqual([{ effect: { id: 2, ranks: [2, 8], type: 'ask' }, from: ['list'] }])
    ;[state] = send(state, ['list'], answer(2, ALL, [2, 8]))
    expect([state.list.active, state.list.top]).toEqual(['grape', 3])
  })
})
