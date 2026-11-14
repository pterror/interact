import { describe, expect, test } from 'bun:test'

import { EditorSelection, Transaction } from '@codemirror/state'
import { EditorView } from '@codemirror/view'

import { segmentData } from './segment-data.js'
import { segments } from './segments.js'

/**
 * An editor over segments, each with a value; a segment split off a heading is text, any other keeps its value
 * @param {readonly Readonly<{ key: string, text: string, value?: string }>[]} initial - The segments
 * @returns {Readonly<{ view: EditorView, s: ReturnType<typeof segments>, d: ReturnType<typeof segmentData<string>>, seen: readonly Transaction[] }>} The editor
 */
function over(initial) {
  const s = segments({ initial })
  const d = segmentData({
    initial: initial.flatMap((each) => (each.value === undefined ? [] : [{ key: each.key, value: each.value }])),
    of: s.of,
    split: (value) => (value === 'heading' ? 'text' : value),
  })
  /** @type {Transaction[]} */
  const seen = []
  const view = new EditorView({
    doc: s.doc,
    extensions: [
      s.extension,
      d.extension,
      EditorView.updateListener.of((update) => {
        seen.push(...update.transactions)
      }),
    ],
    parent: document.createElement('div'),
  })
  return { d, s, seen, view }
}

/**
 * Each segment's key, text and value
 * @param {ReturnType<typeof over>} e - The editor
 * @returns {string[]} `key:text:value` for each, in order
 */
function values(e) {
  return e.s
    .of(e.view.state)
    .map((each) => `${each.key}:${e.view.state.sliceDoc(each.from, each.to)}:${e.d.get(e.view.state, each.key) ?? '-'}`)
}

/**
 * The last transaction the editor saw
 * @param {ReturnType<typeof over>} e - The editor
 * @returns {Transaction} It
 */
function last(e) {
  const found = e.seen.at(-1)
  if (found === undefined) {
    throw new Error('no transaction')
  }
  return found
}

describe('segmentData', () => {
  test('each segment starts with the value the app gave it, and a change is in the transaction that makes it', () => {
    const e = over([
      { key: 'a', text: 'one', value: 'heading' },
      { key: 'b', text: 'two' },
    ])
    expect(values(e)).toEqual(['a:one:heading', 'b:two:-'])
    e.view.dispatch({ changes: { from: 4, insert: '- ' }, effects: e.d.change('b', 'todo') })
    expect(values(e)).toEqual(['a:one:heading', 'b:- two:todo'])
    expect(e.d.changed(last(e))).toEqual(['b'])
    e.view.destroy()
  })

  test('a segment Enter splits off another starts with what the app derives from it, before or after it', () => {
    const e = over([
      { key: 'a', text: 'onetwo', value: 'heading' },
      { key: 'b', text: 'three', value: 'todo' },
    ])
    e.view.dispatch({ selection: EditorSelection.cursor(3) })
    e.s.split(e.view)
    expect(values(e)).toEqual(['a:one:heading', '+1:two:text', 'b:three:todo'])
    e.view.dispatch({ selection: EditorSelection.cursor(8) })
    e.s.split(e.view)
    expect(values(e)).toEqual(['a:one:heading', '+1:two:text', '+2::todo', 'b:three:todo'])
    expect(e.d.changed(last(e))).toEqual(['+2'])
    e.view.destroy()
  })

  test('a value goes with its segment through a move, and comes back with a joined segment on undo', () => {
    const e = over([
      { key: 'a', text: 'one', value: 'heading' },
      { key: 'b', text: 'two', value: 'todo' },
    ])
    e.s.move(e.view, 'a', 'b', true)
    expect(values(e)).toEqual(['b:two:todo', 'a:one:heading'])
    e.view.dispatch({ changes: { from: 3, to: 4, insert: '' }, userEvent: 'delete.backward' })
    expect(values(e)).toEqual(['b:twoone:todo'])
    e.view.dispatch({ changes: { from: 3, insert: '\n' }, userEvent: 'undo' })
    expect(values(e)).toEqual(['b:two:todo', 'a:one:heading'])
    e.view.destroy()
  })

  test('a value put from elsewhere is kept out of undo and out of what the app saves', () => {
    const e = over([{ key: 'a', text: 'one', value: 'text' }])
    e.d.put(e.view, 'a', 'quote')
    const put = last(e)
    expect(values(e)).toEqual(['a:one:quote'])
    expect(put.annotation(Transaction.addToHistory)).toBe(false)
    expect(e.d.changed(put)).toEqual([])
    e.d.put(e.view, 'c', 'todo')
    e.s.insert(e.view, 'a', 'c', 'laid in')
    expect(values(e)).toEqual(['a:one:quote', 'c:laid in:todo'])
    e.view.destroy()
  })

  test("inverse gives the effects that put back what a transaction's changes replaced", () => {
    const e = over([
      { key: 'a', text: 'one', value: 'text' },
      { key: 'b', text: 'two' },
    ])
    e.view.dispatch({ effects: [e.d.change('a', 'heading'), e.d.change('b', 'todo')] })
    e.view.dispatch({ effects: e.d.inverse(last(e)), userEvent: 'undo' })
    expect(values(e)).toEqual(['a:one:text', 'b:two:-'])
    e.view.destroy()
  })
})
