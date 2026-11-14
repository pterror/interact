import { describe, expect, test } from 'bun:test'

import { EditorSelection, Transaction } from '@codemirror/state'

import { fromElsewhere } from './elsewhere.js'
import { over } from './test-segments.js'

/**
 * The last transaction an editor saw
 * @param {readonly Transaction[]} seen - What it saw
 * @returns {Transaction} The last
 */
function last(seen) {
  const found = seen.at(-1)
  if (found === undefined) {
    throw new Error('no transaction')
  }
  return found
}

/**
 * Lets the texts heard be laid in
 * @returns {Promise<void>} When they have been
 */
async function heard() {
  await Bun.sleep(0)
}

describe('segments', () => {
  test("the document is each segment's text as its port has it, in order, one line break between two", () => {
    const e = over([
      { key: 'a', text: 'one\ntwo' },
      { key: 'b', text: '' },
      { key: 'c', text: 'three' },
    ])
    expect(e.view.state.doc.toString()).toBe('one\ntwo\n\nthree')
    expect(e.texts()).toEqual(['a:one\ntwo', 'b:', 'c:three'])
    e.s.stop()
  })

  test('split, a command it binds to no key, splits at the cursor with a key the app makes', () => {
    const e = over([{ key: 'a', text: 'onetwo' }])
    e.view.dispatch({ selection: EditorSelection.cursor(3) })
    e.view.contentDOM.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' }))
    expect(e.texts()).toEqual(['a:onetwo'])
    e.s.split(e.view)
    expect(e.texts()).toEqual(['a:one', '+1:two'])
    e.view.dispatch({ changes: { from: 1, insert: '\n' } })
    expect(e.texts()).toEqual(['a:o\nne', '+1:two'])
    e.s.stop()
  })

  test('split at the start of a segment puts the new, empty one before it, so the text keeps its key', () => {
    const e = over([{ key: 'a', text: 'one' }])
    e.view.dispatch({ selection: EditorSelection.cursor(0) })
    e.s.split(e.view)
    expect(e.texts()).toEqual(['+1:', 'a:one'])
    e.s.stop()
  })

  test('reports the segments a transaction made: split off which, or laid in from elsewhere', () => {
    const e = over([{ key: 'a', text: 'onetwo' }])
    e.view.dispatch({ selection: EditorSelection.cursor(3) })
    e.s.split(e.view)
    expect(e.s.made(last(e.seen))).toEqual([{ from: 'a', key: '+1' }])
    e.stored.set('n', { includes: undefined, listeners: new Set(), text: 'new' })
    e.s.insert('a', 'n')
    expect(e.s.made(last(e.seen))).toEqual([{ from: undefined, key: 'n' }])
    e.view.dispatch({ changes: { from: 0, insert: 'x' } })
    expect(e.s.made(last(e.seen))).toEqual([])
    e.s.stop()
  })

  test("hands each edit on with its segment's key and an id, positions in the segment's text", () => {
    const e = over([
      { key: 'a', text: 'one' },
      { key: 'b', text: 'two' },
    ])
    e.view.dispatch({
      changes: [
        { from: 1, insert: 'x' },
        { from: 5, insert: 'y' },
      ],
    })
    expect(e.edits.map(({ changes, key }) => [key, changes])).toEqual([
      ['a', [{ from: 1, insert: 'x', to: 1 }]],
      ['b', [{ from: 1, insert: 'y', to: 1 }]],
    ])
    expect(new Set(e.edits.map((each) => each.id)).size).toBe(2)
    e.view.dispatch({ selection: EditorSelection.cursor(2) })
    e.s.split(e.view)
    expect(e.edits.slice(2).map(({ changes, key }) => [key, changes])).toEqual([
      ['a', [{ from: 2, insert: '', to: 4 }]],
      ['+1', [{ from: 0, insert: 'ne', to: 0 }]],
    ])
    e.s.stop()
  })

  test('deleting the line break between two joins them, and undo brings the second back with its key', () => {
    const e = over([
      { key: 'a', text: 'one' },
      { key: 'b', text: 'two' },
    ])
    e.view.dispatch({ changes: { from: 3, insert: '', to: 4 }, userEvent: 'delete.backward' })
    expect(e.texts()).toEqual(['a:onetwo'])
    e.view.dispatch({ changes: { from: 2, insert: 'x' } })
    e.view.dispatch({ changes: { from: 4, insert: '\n' }, userEvent: 'undo' })
    expect(e.texts()).toEqual(['a:onxe', 'b:two'])
    e.s.stop()
  })

  test('a selection deleted across segments joins them all into the first; undo brings each back in order', () => {
    const e = over([
      { key: 'a', text: 'aa' },
      { key: 'b', text: 'bb' },
      { key: 'c', text: 'cc' },
    ])
    e.view.dispatch({ changes: { from: 1, insert: '', to: 7 } })
    expect(e.texts()).toEqual(['a:ac'])
    e.view.dispatch({ changes: { from: 1, insert: 'a\nbb\nc' }, userEvent: 'undo' })
    expect(e.texts()).toEqual(['a:aa', 'b:bb', 'c:cc'])
    e.s.stop()
  })

  test("lays a text heard from elsewhere into its segment over the edits it doesn't include, from elsewhere", async () => {
    const e = over([
      { key: 'a', text: 'one' },
      { key: 'b', text: 'two' },
    ])
    e.view.dispatch({ changes: { from: 7, insert: '!' }, selection: EditorSelection.cursor(8) })
    const [typed] = e.edits
    e.hear('b', 'two and more')
    await heard()
    expect(e.texts()).toEqual(['a:one', 'b:two and more!'])
    const laid = e.seen.at(-1)
    expect(laid !== undefined && fromElsewhere(laid)).toBe(true)
    expect(laid?.annotation(Transaction.addToHistory)).toBe(false)
    expect(e.edits).toHaveLength(1)
    e.hear('b', 'two and more!', typed?.id)
    await heard()
    expect(e.texts()).toEqual(['a:one', 'b:two and more!'])
    expect(e.view.state.selection.main.head).toBe(e.view.state.doc.length)
    e.s.stop()
  })

  test('laying in, taking out and moving a segment are from elsewhere, and kept out of undo', () => {
    const e = over([
      { key: 'a', text: 'one' },
      { key: 'b', text: 'two' },
    ])
    e.stored.set('n', { includes: undefined, listeners: new Set(), text: 'new' })
    e.stored.set('f', { includes: undefined, listeners: new Set(), text: 'first' })
    e.s.insert('a', 'n')
    e.s.insert(undefined, 'f')
    expect(e.texts()).toEqual(['f:first', 'a:one', 'n:new', 'b:two'])
    e.s.move('f', 'b', true)
    expect(e.texts()).toEqual(['a:one', 'n:new', 'b:two', 'f:first'])
    e.s.remove('f')
    e.s.remove('n')
    expect(e.texts()).toEqual(['a:one', 'b:two'])
    expect(e.seen.every((each) => fromElsewhere(each) && each.annotation(Transaction.addToHistory) === false)).toBe(
      true,
    )
    expect(e.edits).toEqual([])
    expect([...(e.stored.get('n')?.listeners ?? [])]).toEqual([])
    e.s.stop()
  })

  test("the person's move is undone like their other changes, by the effects inverse gives", () => {
    const e = over([
      { key: 'a', text: 'one' },
      { key: 'b', text: '' },
      { key: 'c', text: 'three' },
    ])
    expect(e.s.reorder('a', 'c', true)).toBe(true)
    expect(e.texts()).toEqual(['b:', 'c:three', 'a:one'])
    const moved = e.seen.at(-1)
    if (moved === undefined) {
      throw new Error('moved')
    }
    expect([fromElsewhere(moved), moved.isUserEvent('move'), moved.annotation(Transaction.addToHistory)]).toEqual([
      false,
      true,
      undefined,
    ])
    expect(e.edits).toEqual([])
    e.view.dispatch({
      changes: moved.changes.invert(moved.startState.doc),
      effects: e.s.inverse(moved),
      userEvent: 'undo',
    })
    expect(e.texts()).toEqual(['a:one', 'b:', 'c:three'])
    expect(e.s.inverse(e.seen.at(-1) ?? moved)).toHaveLength(1)
    expect([e.s.reorder('a', 'gone', true), e.s.reorder('a', 'a', true), e.s.reorder('a', 'b', false)]).toEqual([
      false,
      true,
      true,
    ])
    expect(e.texts()).toEqual(['a:one', 'b:', 'c:three'])
    e.s.stop()
  })

  test('a cursor in a moved segment goes with it; one elsewhere stays where it was in its text', () => {
    const e = over([
      { key: 'a', text: 'one' },
      { key: 'b', text: 'two' },
      { key: 'c', text: 'three' },
    ])
    e.view.dispatch({ selection: EditorSelection.cursor(1) })
    e.s.move('a', 'c', true)
    expect(e.view.state.selection.main.head).toBe(10 + 1)
    e.view.dispatch({ selection: EditorSelection.cursor(6) })
    e.s.move('a', 'b', false)
    expect(e.view.state.sliceDoc(e.view.state.selection.main.head - 2, e.view.state.selection.main.head)).toBe('th')
    e.s.stop()
  })

  test('typing, joining and undo go on as before after a move', () => {
    const e = over([
      { key: 'a', text: 'one' },
      { key: 'b', text: 'two' },
    ])
    e.s.move('b', 'a', false)
    e.view.dispatch({ changes: { from: 3, insert: '', to: 4 }, userEvent: 'delete.backward' })
    expect(e.texts()).toEqual(['b:twoone'])
    e.view.dispatch({ changes: { from: 3, insert: '\n' }, userEvent: 'undo' })
    expect(e.texts()).toEqual(['b:two', 'a:one'])
    e.s.stop()
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
    e.s.stop()
  })
})
