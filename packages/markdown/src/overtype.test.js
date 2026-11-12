import { describe, expect, test } from 'bun:test'

import { Language, defineLanguageFacet, ensureSyntaxTree } from '@codemirror/language'
import { EditorSelection, EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'

import { markdownGrammar } from './grammar.js'
import { overtype } from './overtype.js'

/**
 * An editor over a text with the cursor at a position
 * @param {string} doc - The text
 * @param {number} at - The cursor
 * @returns {EditorView} The editor
 */
function viewOf(doc, at) {
  const view = new EditorView({
    parent: document.createElement('div'),
    state: EditorState.create({
      doc,
      extensions: [new Language(defineLanguageFacet(), markdownGrammar(), [], 'md').extension, overtype()],
      selection: EditorSelection.cursor(at),
    }),
  })
  ensureSyntaxTree(view.state, doc.length, 1000)
  return view
}

/**
 * Types as the browser reports it: a replacement of a range
 * @param {EditorView} view - The editor
 * @param {number} from - The range's start
 * @param {number} to - Its end
 * @param {string} text - What replaces it
 * @returns {boolean} Whether a handler took it
 */
function typed(view, from, to, text) {
  return view.state
    .facet(EditorView.inputHandler)
    .some((handler) => handler(view, from, to, text, () => view.state.update({})))
}

describe('overtype', () => {
  test('steps over a closing mark typed where it is', () => {
    const view = viewOf('**bold**', 6)
    expect(typed(view, 6, 6, '*')).toBe(true)
    expect(view.state.doc.toString()).toBe('**bold**')
    expect(view.state.selection.main.head).toBe(7)
    view.destroy()
  })

  test('takes a word replaced by itself and one more character as that keystroke', () => {
    const view = viewOf('*it*', 3)
    expect(typed(view, 1, 3, 'it*')).toBe(true)
    expect(view.state.doc.toString()).toBe('*it*')
    expect(view.state.selection.main.head).toBe(4)
    view.destroy()
  })

  test('writes an opening mark, or a character that is not next', () => {
    const opening = viewOf('**bold**', 0)
    expect(typed(opening, 0, 0, '*')).toBe(false)
    opening.destroy()
    const other = viewOf('**bold**', 6)
    expect(typed(other, 6, 6, '_')).toBe(false)
    other.destroy()
  })
})
