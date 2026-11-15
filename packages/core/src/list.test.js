import { describe, expect, test } from 'bun:test'

import { start } from './compose.js'
import { list } from './list.js'
import { answer, click, keydown } from './test-inputs.js'

/** @import { ListProps, ListState } from './list.js' */

const ALL = Array.from({ length: 100 }, (_, index) => `k${String(index)}`)

/** @type {ListProps} */
const PROPS = { focusable: true, label: 'Fruit', revision: 0, rows: 5, shown: true }

/**
 * A list started with props, its first ask answered from `ALL`
 * @param {ListProps} props - Its props
 * @returns {ListState} The list
 */
function loaded(props = PROPS) {
  const state = list.init(props)
  const [asking] = list.step(state, { props, type: 'props' })
  const [done] = list.step(asking, answer(asking.asked, ALL, [0, 6]))
  return done
}

describe('list', () => {
  test('asks for its first window when it starts, one key either side of what it draws', () => {
    const [, outs] = start(list, PROPS)
    expect(outs).toEqual([{ effect: { id: 1, ranks: [0, 6], type: 'ask' }, from: [] }])
  })

  test('draws only the window: options are called for the keys in it, with their place in the whole', () => {
    const state = loaded()
    const view = list.view(state, PROPS)
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

  test('moves the active option, and past the window asks for the next one, taking the key once it comes', () => {
    let [state, effects] = list.step(loaded(), keydown('root', 'ArrowDown'))
    expect([state.active, effects]).toEqual(['k0', [{ type: 'preventDefault' }]])
    for (const _ of [1, 2, 3, 4]) {
      ;[state] = list.step(state, keydown('root', 'ArrowDown'))
    }
    expect([state.active, state.top]).toEqual(['k4', 0])
    ;[state, effects] = list.step(state, keydown('root', 'ArrowDown'))
    expect(state.active).toBe('k5')
    expect(effects).toEqual([{ type: 'preventDefault' }, { id: 2, ranks: [0, 7], type: 'ask' }])
    ;[state, effects] = list.step(state, keydown('root', 'PageDown'))
    expect([state.active, state.activeRank, state.follow]).toEqual(['k5', 9, 'rank'])
    expect(effects).toEqual([{ type: 'preventDefault' }, { id: 3, ranks: [4, 11], type: 'ask' }])
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

  test('keeps its own value when not given one, and emits change either way', () => {
    const [own, ownEffects] = list.step(loaded(), click('option', 'k2'))
    expect([own.selected, ownEffects]).toEqual(['k2', [{ type: 'change', value: 'k2' }]])

    const controlledProps = { ...PROPS, selected: 'k1' }
    const controlled = loaded(controlledProps)
    const [after, effects] = list.step(controlled, click('option', 'k2'))
    expect([after.selected, effects]).toEqual(['k1', [{ type: 'change', value: 'k2' }]])
    const [given] = list.step(after, { props: { ...controlledProps, selected: 'k2' }, type: 'props' })
    expect(given.selected).toBe('k2')
  })

  test('asks for a window holding the selected key when shown, and makes it active', () => {
    const props = { ...PROPS, selected: 'k50', shown: false }
    const hidden = list.init(props)
    const [state, effects] = list.step(hidden, { props: { ...props, shown: true }, type: 'props' })
    expect(effects).toEqual([{ id: 1, locate: 'k50', rows: 7, type: 'ask' }])
    const [shown] = list.step(state, answer(1, ALL, [47, 54]))
    expect([shown.active, shown.activeRank, shown.top]).toEqual(['k50', 50, 48])
  })

  test('asks again when the collection changes, keeping the active key where it went', () => {
    const [moved] = list.step(loaded(), keydown('root', 'ArrowDown'))
    const [state, effects] = list.step(moved, { props: { ...PROPS, revision: 1 }, type: 'props' })
    expect(effects).toEqual([{ id: 2, ranks: [0, 6], type: 'ask' }])
    const reordered = ['k1', 'k2', 'k0', ...ALL.slice(3)]
    const [after] = list.step(state, answer(2, reordered, [0, 6]))
    expect([after.active, after.activeRank]).toEqual(['k0', 2])
  })
})
