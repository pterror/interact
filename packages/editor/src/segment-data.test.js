import { describe, expect, test } from 'bun:test'

import { EditorSelection, Transaction } from '@codemirror/state'

import { segmentData } from './segment-data.js'
import { over } from './test-segments.js'

/**
 * An editor over segments, each with a value; a segment split off a heading is text, any other keeps its value
 * @param {readonly Readonly<{ key: string, text: string, value?: string }>[]} initial - The segments
 * @returns {Readonly<ReturnType<typeof over> & {
 *   d: ReturnType<typeof segmentData<string, string>>,
 *   values: () => string[],
 *   last: () => Transaction,
 * }>} The editor; the values; each segment's key, text and value (`key:text:value`), in order; and the last
 *   transaction the editor saw
 */
function valued(initial) {
  /** @type {{ d?: ReturnType<typeof segmentData<string, string>> }} */
  const kept = {}
  const e = over(initial, (made) => {
    const d = segmentData({
      initial: initial.flatMap((each) => (each.value === undefined ? [] : [{ key: each.key, value: each.value }])),
      made,
      splitOff: (value) => (value === 'heading' ? 'text' : value),
    })
    kept.d = d
    return [d.extension]
  })
  const { d } = kept
  if (d === undefined) {
    throw new Error('composed')
  }
  return {
    ...e,
    d,
    last() {
      const found = e.seen.at(-1)
      if (found === undefined) {
        throw new Error('no transaction')
      }
      return found
    },
    values: () =>
      e.s
        .of(e.view.state)
        .map(
          (each) => `${each.key}:${e.view.state.sliceDoc(each.from, each.to)}:${d.get(e.view.state, each.key) ?? '-'}`,
        ),
  }
}

describe('segmentData', () => {
  test('each segment starts with the value the app gave it, and a change is in the transaction that makes it', () => {
    const e = valued([
      { key: 'a', text: 'one', value: 'heading' },
      { key: 'b', text: 'two' },
    ])
    expect(e.values()).toEqual(['a:one:heading', 'b:two:-'])
    e.view.dispatch({ changes: { from: 4, insert: '- ' }, effects: e.d.change('b', 'todo') })
    expect(e.values()).toEqual(['a:one:heading', 'b:- two:todo'])
    expect(e.d.changed(e.last())).toEqual(['b'])
    e.s.stop()
  })

  test('a segment split off another starts with what the app derives from it, before or after it', () => {
    const e = valued([
      { key: 'a', text: 'onetwo', value: 'heading' },
      { key: 'b', text: 'three', value: 'todo' },
    ])
    e.view.dispatch({ selection: EditorSelection.cursor(3) })
    e.s.split(e.view)
    expect(e.values()).toEqual(['a:one:heading', '+1:two:text', 'b:three:todo'])
    e.view.dispatch({ selection: EditorSelection.cursor(8) })
    e.s.split(e.view)
    expect(e.values()).toEqual(['a:one:heading', '+1:two:text', '+2::todo', 'b:three:todo'])
    expect(e.d.changed(e.last())).toEqual(['+2'])
    e.s.stop()
  })

  test("a segment laid in from elsewhere next to another never takes the other's value", () => {
    const e = valued([{ key: 'a', text: 'one', value: 'heading' }])
    e.stored.set('n', { includes: undefined, listeners: new Set(), text: 'laid in' })
    e.s.insert('a', 'n')
    e.stored.set('f', { includes: undefined, listeners: new Set(), text: 'first' })
    e.s.insert(undefined, 'f')
    expect(e.values()).toEqual(['f:first:-', 'a:one:heading', 'n:laid in:-'])
    e.s.stop()
  })

  test('a value goes with its segment through a move, and comes back with a joined segment on undo', () => {
    const e = valued([
      { key: 'a', text: 'one', value: 'heading' },
      { key: 'b', text: 'two', value: 'todo' },
    ])
    e.s.move('a', 'b', true)
    expect(e.values()).toEqual(['b:two:todo', 'a:one:heading'])
    e.view.dispatch({ changes: { from: 3, insert: '', to: 4 }, userEvent: 'delete.backward' })
    expect(e.values()).toEqual(['b:twoone:todo'])
    e.view.dispatch({ changes: { from: 3, insert: '\n' }, userEvent: 'undo' })
    expect(e.values()).toEqual(['b:two:todo', 'a:one:heading'])
    e.s.stop()
  })

  test('a value put from elsewhere is kept out of undo and out of what the app saves', () => {
    const e = valued([{ key: 'a', text: 'one', value: 'text' }])
    e.d.put(e.view, 'a', 'quote')
    const put = e.last()
    expect(e.values()).toEqual(['a:one:quote'])
    expect(put.annotation(Transaction.addToHistory)).toBe(false)
    expect(e.d.changed(put)).toEqual([])
    e.d.put(e.view, 'c', 'todo')
    e.stored.set('c', { includes: undefined, listeners: new Set(), text: 'laid in' })
    e.s.insert('a', 'c')
    expect(e.values()).toEqual(['a:one:quote', 'c:laid in:todo'])
    e.s.stop()
  })

  test("inverse gives the effects that put back what a transaction's changes replaced", () => {
    const e = valued([
      { key: 'a', text: 'one', value: 'text' },
      { key: 'b', text: 'two' },
    ])
    e.view.dispatch({ effects: [e.d.change('a', 'heading'), e.d.change('b', 'todo')] })
    e.view.dispatch({ effects: e.d.inverse(e.last()), userEvent: 'undo' })
    expect(e.values()).toEqual(['a:one:text', 'b:two:-'])
    e.s.stop()
  })
})
