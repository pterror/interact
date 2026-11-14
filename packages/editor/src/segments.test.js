import { describe, expect, test } from 'bun:test'

import { EditorSelection, Transaction } from '@codemirror/state'
import { EditorView } from '@codemirror/view'

import { fromElsewhere, segments } from './segments.js'

/**
 * An editor over segments, and every transaction it saw
 * @param {readonly Readonly<{ key: string, text: string }>[]} initial - The segments
 * @returns {{ view: EditorView, s: ReturnType<typeof segments>, seen: Transaction[] }} The editor
 */
function over(initial) {
  const s = segments({ initial })
  /** @type {Transaction[]} */
  const seen = []
  const view = new EditorView({
    doc: s.doc,
    extensions: [
      s.extension,
      EditorView.updateListener.of((update) => {
        seen.push(...update.transactions)
      }),
    ],
    parent: document.createElement('div'),
  })
  return { s, seen, view }
}

/**
 * Each segment's key and text
 * @param {ReturnType<typeof segments>} s - Its segments
 * @param {EditorView} view - The editor
 * @returns {string[]} `key:text` for each, in order
 */
function texts(s, view) {
  return s.of(view.state).map((each) => `${each.key}:${view.state.sliceDoc(each.from, each.to)}`)
}

describe('segments', () => {
  test('the document is the texts in order, one line break between two', () => {
    const e = over([
      { key: 'a', text: 'one\ntwo' },
      { key: 'b', text: '' },
      { key: 'c', text: 'three' },
    ])
    expect(e.view.state.doc.toString()).toBe('one\ntwo\n\nthree')
    expect(texts(e.s, e.view)).toEqual(['a:one\ntwo', 'b:', 'c:three'])
    e.view.destroy()
  })

  test('Enter splits a segment at the cursor; a line break typed otherwise stays in it', () => {
    const e = over([{ key: 'a', text: 'onetwo' }])
    e.view.dispatch({ selection: EditorSelection.cursor(3) })
    e.s.split(e.view)
    expect(texts(e.s, e.view)).toEqual(['a:one', '+1:two'])
    e.view.dispatch({ changes: { from: 1, insert: '\n' } })
    expect(texts(e.s, e.view)).toEqual(['a:o\nne', '+1:two'])
    e.view.destroy()
  })

  test('Enter at the start of a segment puts the new, empty one before it, so the text keeps its key', () => {
    const e = over([{ key: 'a', text: 'one' }])
    e.view.dispatch({ selection: EditorSelection.cursor(0) })
    e.s.split(e.view)
    expect(texts(e.s, e.view)).toEqual(['+1:', 'a:one'])
    e.view.destroy()
  })

  test('deleting the line break between two joins them, and undo brings the second back with its key', () => {
    const e = over([
      { key: 'a', text: 'one' },
      { key: 'b', text: 'two' },
    ])
    e.view.dispatch({ changes: { from: 3, insert: '', to: 4 }, userEvent: 'delete.backward' })
    expect(texts(e.s, e.view)).toEqual(['a:onetwo'])
    e.view.dispatch({ changes: { from: 2, insert: 'x' } })
    e.view.dispatch({ changes: { from: 4, insert: '\n' }, userEvent: 'undo' })
    expect(texts(e.s, e.view)).toEqual(['a:onxe', 'b:two'])
    e.view.destroy()
  })

  test('a selection deleted across segments joins them all into the first; undo brings each back in order', () => {
    const e = over([
      { key: 'a', text: 'aa' },
      { key: 'b', text: 'bb' },
      { key: 'c', text: 'cc' },
    ])
    e.view.dispatch({ changes: { from: 1, insert: '', to: 7 } })
    expect(texts(e.s, e.view)).toEqual(['a:ac'])
    e.view.dispatch({ changes: { from: 1, insert: 'a\nbb\nc' }, userEvent: 'undo' })
    expect(texts(e.s, e.view)).toEqual(['a:aa', 'b:bb', 'c:cc'])
    e.view.destroy()
  })

  test('laying in, taking out and changing a segment are from elsewhere, and kept out of undo', () => {
    const e = over([
      { key: 'a', text: 'one' },
      { key: 'b', text: 'two' },
    ])
    e.s.insert(e.view, 'a', 'n', 'new')
    e.s.insert(e.view, undefined, 'f', 'first')
    expect(texts(e.s, e.view)).toEqual(['f:first', 'a:one', 'n:new', 'b:two'])
    e.s.replace(e.view, 'n', [{ from: 3, insert: 'er', to: 3 }])
    expect(texts(e.s, e.view)).toEqual(['f:first', 'a:one', 'n:newer', 'b:two'])
    e.s.remove(e.view, 'f')
    e.s.remove(e.view, 'n')
    expect(texts(e.s, e.view)).toEqual(['a:one', 'b:two'])
    expect(e.seen.every((each) => fromElsewhere(each) && each.annotation(Transaction.addToHistory) === false)).toBe(
      true,
    )
    e.view.destroy()
  })

  test('a change elsewhere keeps the cursor where it was in the text typed', () => {
    const e = over([
      { key: 'a', text: 'one' },
      { key: 'b', text: 'two' },
    ])
    e.view.dispatch({ selection: EditorSelection.cursor(6) })
    e.s.replace(e.view, 'a', [{ from: 0, insert: 'zero ', to: 0 }])
    expect(e.view.state.sliceDoc(e.view.state.selection.main.head - 2, e.view.state.selection.main.head)).toBe('tw')
    e.view.destroy()
  })

  test('a segment moves before or after another with its key and text, from elsewhere', () => {
    const e = over([
      { key: 'a', text: 'one' },
      { key: 'b', text: '' },
      { key: 'c', text: 'three' },
    ])
    e.s.move(e.view, 'a', 'c', true)
    expect(texts(e.s, e.view)).toEqual(['b:', 'c:three', 'a:one'])
    e.s.move(e.view, 'a', 'b', false)
    expect(texts(e.s, e.view)).toEqual(['a:one', 'b:', 'c:three'])
    e.s.move(e.view, 'c', 'b', false)
    expect(texts(e.s, e.view)).toEqual(['a:one', 'c:three', 'b:'])
    e.s.move(e.view, 'b', 'a', true)
    expect(texts(e.s, e.view)).toEqual(['a:one', 'b:', 'c:three'])
    expect(e.view.state.doc.toString()).toBe('one\n\nthree')
    expect(e.seen.every((each) => fromElsewhere(each) && each.annotation(Transaction.addToHistory) === false)).toBe(
      true,
    )
    e.view.destroy()
  })

  test('moving a segment to where it is, or onto itself, changes nothing', () => {
    const e = over([
      { key: 'a', text: 'one' },
      { key: 'b', text: 'two' },
    ])
    e.s.move(e.view, 'a', 'b', false)
    e.s.move(e.view, 'b', 'a', true)
    e.s.move(e.view, 'a', 'a', true)
    e.s.move(e.view, 'a', 'gone', true)
    expect(e.seen).toEqual([])
    e.view.destroy()
  })

  test('a cursor in a moved segment goes with it; one elsewhere stays where it was in its text', () => {
    const e = over([
      { key: 'a', text: 'one' },
      { key: 'b', text: 'two' },
      { key: 'c', text: 'three' },
    ])
    e.view.dispatch({ selection: EditorSelection.cursor(1) })
    e.s.move(e.view, 'a', 'c', true)
    expect(e.view.state.selection.main.head).toBe(10 + 1)
    e.view.dispatch({ selection: EditorSelection.cursor(6) })
    e.s.move(e.view, 'a', 'b', false)
    expect(e.view.state.sliceDoc(e.view.state.selection.main.head - 2, e.view.state.selection.main.head)).toBe('th')
    e.view.destroy()
  })

  test('typing, joining and undo go on as before after a move', () => {
    const e = over([
      { key: 'a', text: 'one' },
      { key: 'b', text: 'two' },
    ])
    e.s.move(e.view, 'b', 'a', false)
    e.view.dispatch({ changes: { from: 3, insert: '', to: 4 }, userEvent: 'delete.backward' })
    expect(texts(e.s, e.view)).toEqual(['b:twoone'])
    e.view.dispatch({ changes: { from: 3, insert: '\n' }, userEvent: 'undo' })
    expect(texts(e.s, e.view)).toEqual(['b:two', 'a:one'])
    e.view.destroy()
  })

  test("each segment's first line is marked, empty ones as such, for the app to style", () => {
    const e = over([
      { key: 'a', text: 'one' },
      { key: 'b', text: '' },
    ])
    const marked = [...e.view.contentDOM.querySelectorAll('[data-segment]')].map((line) =>
      line instanceof HTMLElement ? line.dataset['segment'] : undefined,
    )
    expect(marked).toEqual(['', 'empty'])
    e.view.destroy()
  })
})
