import { describe, expect, test } from 'bun:test'

import { start } from './compose.js'
import { list } from './list.js'
import { answer, click, keydown } from './test-inputs.js'

/** @import { ListProps, ListState } from './list.js' */

const ALL = Array.from({ length: 100 }, (_, index) => `k${String(index)}`)

/** @type {ListProps} */
const PROPS = { focusable: true, hover: false, label: 'Fruit', rows: 5, selected: null, shown: true, source: 'fruit' }

/**
 * A list started with props, its first ask answered from `ALL`
 * @param {ListProps} props - Its props
 * @returns {ListState} The list
 */
function loaded(props = PROPS) {
  const [asking] = list.init(props)
  const [done] = list.step(asking, answer(asking.asked, ALL, [0, 6]))
  return done
}

describe('list', () => {
  test('asks for its first window as it starts, one key either side of what it draws', () => {
    const [, outs] = start(list, PROPS)
    expect(outs).toEqual([{ effect: { id: 1, ranks: [0, 6], source: 'fruit', type: 'ask' }, from: [] }])
  })

  test('draws only the window: options are called for the keys in it, with their place in the whole', () => {
    const view = list.view(loaded(), PROPS)
    const root = view['root']
    const option = view['option']
    expect(typeof root === 'function' ? null : root?.content).toEqual([
      { each: 'option', keys: ['k0', 'k1', 'k2', 'k3', 'k4'] },
    ])
    expect(typeof option === 'function' ? option('k3').aria : null).toEqual({
      posinset: 4,
      selected: false,
      setsize: 100,
    })
  })

  test('moves the active option, telling it, and past the window asks for the next one, taking the key once it comes', () => {
    let [state, effects] = list.step(loaded(), keydown('root', 'ArrowDown'))
    expect([state.active, effects]).toEqual(['k0', [{ type: 'preventDefault' }, { item: 'k0', type: 'active' }]])
    for (const _ of [1, 2, 3, 4]) {
      ;[state] = list.step(state, keydown('root', 'ArrowDown'))
    }
    expect([state.active, state.top]).toEqual(['k4', 0])
    ;[state, effects] = list.step(state, keydown('root', 'ArrowDown'))
    expect(state.active).toBe('k5')
    expect(effects).toEqual([
      { type: 'preventDefault' },
      { id: 2, ranks: [0, 7], source: 'fruit', type: 'ask' },
      { item: 'k5', type: 'active' },
    ])
    ;[state] = list.step(state, keydown('root', 'PageDown'))
    expect([state.active, state.activeRank, state.follow]).toEqual(['k5', 9, 'rank'])
    ;[state] = list.step(state, answer(3, ALL, [4, 11]))
    expect([state.active, state.follow]).toEqual(['k9', 'key'])
  })

  test('drops an answer to any ask but the latest', () => {
    let [state] = list.step(loaded(), keydown('root', 'End'))
    ;[state] = list.step(state, keydown('root', 'Home'))
    const [after, effects] = list.step(state, answer(2, ALL, [94, 100]))
    expect([after, effects]).toEqual([state, []])
    ;[state] = list.step(state, answer(3, ALL, [0, 6]))
    expect(state.active).toBe('k0')
  })

  test('keeps its own value when not given one, emitting change with an id', () => {
    const [own, effects] = list.step(loaded(), click('option', 'k2'))
    expect([own.selection.app, effects]).toEqual([
      'k2',
      [
        { id: 1, type: 'change', value: 'k2' },
        { item: 'k2', type: 'active' },
      ],
    ])
  })

  test('given a value, shows a choice at once, pending until the props confirm it, and undoes it when refused', () => {
    const props = { ...PROPS, selected: { value: 'k1' } }
    const [chosen, effects] = list.step(loaded(props), click('option', 'k2'))
    const selected = (/** @type {ListState} */ state, /** @type {string} */ key) => {
      const option = list.view(state, props)['option']
      return typeof option === 'function' ? option(key).aria['selected'] : null
    }
    expect([selected(chosen, 'k2'), selected(chosen, 'k1'), effects]).toEqual([
      true,
      false,
      [
        { id: 1, type: 'change', value: 'k2' },
        { item: 'k2', type: 'active' },
      ],
    ])
    const [confirmed] = list.step(chosen, { props: { ...props, selected: { value: 'k2' } }, type: 'props' })
    expect([confirmed.selection.changes, selected(confirmed, 'k2')]).toEqual([[], true])
    const [refused] = list.step(chosen, { id: 1, type: 'refused' })
    expect([selected(refused, 'k1'), selected(refused, 'k2')]).toEqual([true, false])
  })

  test('asks for a window holding the selected key when shown, and makes it active', () => {
    const props = { ...PROPS, selected: { value: 'k50' }, shown: false }
    const [hidden] = list.init(props)
    const [state, effects] = list.step(hidden, { props: { ...props, shown: true }, type: 'props' })
    expect(effects).toEqual([{ id: 1, locate: 'k50', rows: 7, source: 'fruit', type: 'ask' }])
    const [shown] = list.step(state, answer(1, ALL, [47, 54]))
    expect([shown.active, shown.activeRank, shown.top]).toEqual(['k50', 50, 48])
  })

  test('asks again when the collection changed, keeping the active key where it went', () => {
    const [moved] = list.step(loaded(), keydown('root', 'ArrowDown'))
    const [state, effects] = list.step(moved, { type: 'changed' })
    expect(effects).toEqual([{ id: 2, ranks: [0, 6], source: 'fruit', type: 'ask' }])
    const [after] = list.step(state, answer(2, ['k1', 'k2', 'k0', ...ALL.slice(3)], [0, 6]))
    expect([after.active, after.activeRank]).toEqual(['k0', 2])
  })

  test('windows by its scroll offset once an option has been measured', () => {
    const [measured] = list.step(loaded(), { item: 'k0', part: 'option', size: 24, timeStamp: 0, type: 'measured' })
    const [scrolled, effects] = list.step(measured, {
      item: null,
      offset: 240,
      part: 'root',
      timeStamp: 0,
      type: 'scroll',
    })
    expect([scrolled.top, effects]).toEqual([10, [{ id: 2, ranks: [9, 16], source: 'fruit', type: 'ask' }]])
  })
})
