import { describe, expect, test } from 'bun:test'

import { deliver, resolve, start } from './compose.js'
import { shown } from './pending.js'
import { select } from './select.js'
import { answer, click, keydown, pointer } from './test-inputs.js'

/** @import { Out, StateOf } from './compose.js' */
/** @import { SelectProps } from './select.js' */

/** @typedef {StateOf<typeof select>} SelectState */

const ALL = ['apple', 'banana', 'cherry', 'date', 'elderberry', 'fig', 'grape']

/** @type {SelectProps} */
const PROPS = { disabled: false, label: 'Fruit', placeholder: 'Choose', rows: 4, source: 'fruit', value: null }

/**
 * Whether a value is a select's state
 * @param {unknown} value - The value
 * @returns {value is SelectState} Whether it has a select's fields
 */
function isSelect(value) {
  return typeof value === 'object' && value !== null && 'own' in value && 'children' in value
}

/**
 * A select's state from the runtime, checked
 * @param {unknown} value - The state
 * @returns {SelectState} The same, as a select's
 */
function checked(value) {
  if (!isSelect(value)) {
    throw new TypeError('Not a select')
  }
  return value
}

/**
 * Delivers an input
 * @param {SelectState} state - The select
 * @param {readonly string[]} path - The widget it is for
 * @param {unknown} input - The input
 * @returns {readonly [SelectState, readonly unknown[]]} The select and the effects that reach the host, with where
 *   each came from when not the select itself
 */
function send(state, path, input) {
  const [next, outs] = deliver(select, state, path, input)
  return [checked(next), outs.map((out) => (out.from.length === 0 ? out.effect : out))]
}

/**
 * A select started
 * @param {SelectProps} props - Its props
 * @returns {readonly [SelectState, readonly Out[]]} The select and what starting it emitted
 */
function started(props = PROPS) {
  const [state, outs] = start(select, props)
  return [checked(state), outs]
}

/**
 * A select started and opened, its list's ask answered
 * @param {SelectProps} props - Its props
 * @returns {SelectState} The select
 */
function opened(props = PROPS) {
  const [state] = send(started(props)[0], [], click('trigger'))
  return send(state, ['list'], answer(state.children.list.asked, ALL, [0, 5]))[0]
}

describe('select', () => {
  test('disabled selects cannot open by keyboard, pointer or click and are not tab stops', () => {
    const [first] = started({ ...PROPS, disabled: true })
    for (const input of [
      click('trigger'),
      keydown('trigger', 'ArrowDown'),
      pointer('pointerdown', 'trigger', null, [0, 0]),
    ]) {
      const [state, effects] = send(first, [], input)
      expect(state.own.open).toBe(false)
      expect(effects).toEqual([])
    }
    const [trigger] = resolve(select, first, { ...PROPS, disabled: true }).content
    expect(trigger !== undefined && 'aria' in trigger ? trigger.aria['disabled'] : null).toBe(true)
    expect(trigger !== undefined && 'tabindex' in trigger ? trigger.tabindex : null).toBe(-1)
  })

  test('disabling an open select closes it without choosing; enabling restores interaction', () => {
    const before = opened()
    const [disabled, effects] = send(before, [], { type: 'props', props: { ...PROPS, disabled: true } })
    expect(disabled.own.open).toBe(false)
    expect(
      effects.some(
        (effect) => typeof effect === 'object' && effect !== null && 'type' in effect && effect.type === 'change',
      ),
    ).toBe(false)
    const [enabled] = send(disabled, [], { type: 'props', props: PROPS })
    expect(send(enabled, [], click('trigger'))[0].own.open).toBe(true)
  })
  test('starts closed, asking for nothing until it opens; opening asks its list, which answers back to the list', () => {
    const [first, outs] = started()
    expect(outs).toEqual([])
    const [state, effects] = send(first, [], keydown('trigger', 'ArrowDown'))
    expect(effects).toEqual([
      { type: 'preventDefault' },
      { effect: { id: 1, ranks: [0, 5], source: 'fruit', type: 'ask' }, from: ['list'] },
    ])
    const [answered] = send(state, ['list'], answer(1, ALL, [0, 5]))
    expect(answered.children.list.keys).toEqual(ALL.slice(0, 5))
  })

  test("opens on the first option when nothing is chosen, named in the trigger's aria-activedescendant", () => {
    const first = opened()
    expect(first.own.active).toBe('apple')
    const [state, effects] = send(first, [], keydown('trigger', 'ArrowDown'))
    expect(effects).toEqual([{ effect: { type: 'preventDefault' }, from: ['list'] }])
    expect(state.own.active).toBe('banana')
    const [trigger] = resolve(select, state, PROPS).content
    expect(trigger !== undefined && 'aria' in trigger ? trigger.aria['activedescendant'] : null).toEqual({
      item: 'banana',
      owner: ['list'],
      part: 'option',
    })
  })

  test('chooses with Enter, keeping its own value when not given one', () => {
    const [state, effects] = send(opened(), [], keydown('trigger', 'Enter'))
    expect([state.own.open, shown(state.own.value)]).toEqual([false, 'apple'])
    expect(effects).toEqual([{ type: 'preventDefault' }, { id: 1, type: 'change', value: 'apple' }])
  })

  test('given a value, shows a choice at once, pending; the props confirm it, a refusal undoes it', () => {
    const props = { ...PROPS, value: { value: 'cherry' } }
    let [state, effects] = send(started(props)[0], [], click('trigger'))
    expect(effects).toEqual([
      { effect: { id: 1, locate: 'cherry', rows: 6, source: 'fruit', type: 'ask' }, from: ['list'] },
    ])
    ;[state] = send(state, ['list'], answer(1, ALL, [0, 6]))
    expect(state.own.active).toBe('cherry')
    ;[state, effects] = send(state, ['list'], click('option', 'fig'))
    expect(effects).toEqual([{ id: 1, type: 'change', value: 'fig' }])
    expect([state.own.open, shown(state.own.value), state.children.list.selection.app]).toEqual([false, 'fig', 'fig'])
    const [confirmed] = send(state, [], { props: { ...props, value: { value: 'fig' } }, type: 'props' })
    expect([confirmed.own.value.changes, shown(confirmed.own.value)]).toEqual([[], 'fig'])
    const [refused] = send(state, [], { id: 1, type: 'refused' })
    expect([shown(refused.own.value), refused.children.list.selection.app]).toEqual(['cherry', 'cherry'])
  })

  test('captures a press in its list to keep focus on the trigger, and closes on a click in it after the list', () => {
    const state = opened()
    const press = { button: 0, item: 'apple', part: 'option', timeStamp: 0, type: 'mousedown' }
    expect(send(state, ['list'], press)[1]).toEqual([{ type: 'preventDefault' }])
    const [chosen] = send(state, ['list'], click('option', 'apple'))
    const [again] = send(send(chosen, [], click('trigger'))[0], ['list'], click('option', 'apple'))
    expect(again.own.open).toBe(false)
  })

  test('closes on Escape without choosing, and on blur choosing the active option', () => {
    const moved = opened()
    const [escaped] = send(moved, [], keydown('trigger', 'Escape'))
    expect([escaped.own.open, shown(escaped.own.value)]).toEqual([false, null])
    const [blurred] = send(moved, [], { item: null, part: 'trigger', timeStamp: 0, type: 'blur' })
    expect([blurred.own.open, shown(blurred.own.value)]).toEqual([false, 'apple'])
  })

  test('opens on a character typed, the list asking the host to find it; Space is typed while a prefix is', () => {
    const [state, effects] = send(started()[0], [], keydown('trigger', 'c', { timeStamp: 100 }))
    expect(state.own.open).toBe(true)
    expect(effects).toEqual([
      { effect: { id: 1, ranks: [0, 5], source: 'fruit', type: 'ask' }, from: ['list'] },
      { effect: { type: 'preventDefault' }, from: ['list'] },
      { effect: { at: null, find: 'c', id: 1, next: true, source: 'fruit', type: 'ask' }, from: ['list'] },
      { effect: { at: 600, type: 'wake' }, from: ['list'] },
    ])
    const [loaded] = send(state, ['list'], answer(1, ALL, [0, 5]))
    const [found] = send(loaded, ['list'], { id: 1, key: 'cherry', type: 'found' })
    expect(found.own.active).toBe('cherry')
    const [spaced, typed] = send(found, [], keydown('trigger', ' ', { timeStamp: 200 }))
    expect([spaced.own.open, typed.at(1)]).toEqual([
      true,
      { effect: { at: 'cherry', find: 'c ', id: 2, next: false, source: 'fruit', type: 'ask' }, from: ['list'] },
    ])
    const [chosen] = send(spaced, [], keydown('trigger', ' ', { timeStamp: 900 }))
    expect([chosen.own.open, shown(chosen.own.value)]).toEqual([false, 'cherry'])
  })

  test('a mouse press opens it, the option under the pointer is active, and a release over one chooses it', () => {
    let [state] = send(started()[0], [], pointer('pointerdown', 'trigger', null, [0, 0]))
    expect(state.own.open).toBe(true)
    ;[state] = send(state, ['list'], answer(1, ALL, [0, 5]))
    ;[state] = send(state, ['list'], pointer('pointermove', 'option', 'cherry', [0, 40]))
    expect(state.own.active).toBe('cherry')
    const [chosen, effects] = send(state, ['list'], pointer('pointerup', 'option', 'cherry', [0, 40]))
    expect([chosen.own.open, effects]).toEqual([false, [{ id: 1, type: 'change', value: 'cherry' }]])
    const [clicked] = send(chosen, [], click('trigger'))
    expect(clicked.own.open).toBe(false)
    const [touched] = send(clicked, [], { ...pointer('pointerdown', 'trigger', null, [0, 0]), pointerType: 'touch' })
    expect(touched.own.open).toBe(false)
    expect(send(touched, [], click('trigger'))[0].own.open).toBe(true)
  })

  test('a mouse press and release on the trigger opens it and leaves it open', () => {
    const [pressed] = send(started()[0], [], pointer('pointerdown', 'trigger', null, [0, 0]))
    const [released] = send(pressed, [], pointer('pointerup', 'trigger', null, [0, 0]))
    expect(send(released, [], click('trigger'))[0].own.open).toBe(true)
  })

  test('opens on End, handing the key to the list, which moves once it knows the count', () => {
    let [state, effects] = send(started()[0], [], keydown('trigger', 'End'))
    expect(effects).toEqual([
      { type: 'preventDefault' },
      { effect: { id: 1, ranks: [0, 5], source: 'fruit', type: 'ask' }, from: ['list'] },
      { effect: { type: 'preventDefault' }, from: ['list'] },
    ])
    ;[state, effects] = send(state, ['list'], answer(1, ALL, [0, 5]))
    expect(effects).toEqual([{ effect: { id: 2, ranks: [2, 8], source: 'fruit', type: 'ask' }, from: ['list'] }])
    ;[state] = send(state, ['list'], answer(2, ALL, [2, 8]))
    expect(state.own.active).toBe('grape')
  })
})
