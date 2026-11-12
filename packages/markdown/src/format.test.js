import { describe, expect, test } from 'bun:test'

import { EditorSelection, EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { grammarLanguage } from '@pterror/interact-editor/grammar-language'

import { codeBlock, hasStyle, heading, inLink, inQuote, link, list, quote, toggleStyle } from './format.js'
import { testGrammar } from './test-grammar.js'

/**
 * An editor over a text, the selection written in it as `|` (a cursor) or `[`...`]`
 * @param {string} written - The text with its selection
 * @returns {EditorView} The editor
 */
function viewOf(written) {
  const anchor = written.includes('[') ? written.indexOf('[') : written.indexOf('|')
  const doc = written.replaceAll(/[[\]|]/gu, '')
  const head = written.includes(']') ? written.indexOf(']') - 1 : anchor
  return new EditorView({
    parent: document.createElement('div'),
    state: EditorState.create({
      doc,
      extensions: grammarLanguage(testGrammar),
      selection: EditorSelection.range(anchor, head),
    }),
  })
}

/**
 * An editor's text with its selection written in, as `viewOf` reads it
 * @param {EditorView} view - The editor
 * @returns {string} The text
 */
function writtenOf(view) {
  const { from, to } = view.state.selection.main
  const doc = view.state.doc.toString()
  return from === to
    ? `${doc.slice(0, from)}|${doc.slice(from)}`
    : `${doc.slice(0, from)}[${doc.slice(from, to)}]${doc.slice(to)}`
}

/**
 * Runs a command on a text and gives the result
 * @param {string} written - The text with its selection
 * @param {(view: EditorView) => boolean} command - The command
 * @returns {string} The text after, with its selection
 */
function after(written, command) {
  const view = viewOf(written)
  command(view)
  const result = writtenOf(view)
  view.destroy()
  return result
}

describe('styles', () => {
  test('wrap the selection, leaving trailing space outside', () => {
    expect(after('a [word ]b', toggleStyle('bold'))).toBe('a **[word]** b')
  })

  test('wrap the word at the cursor, or write an empty pair between words', () => {
    expect(after('a wo|rd b', toggleStyle('italic'))).toBe('a *wo|rd* b')
    expect(after('a | b', toggleStyle('italic'))).toBe('a *|* b')
  })

  test('take an empty pair out again', () => {
    expect(after('a *|* b', toggleStyle('italic'))).toBe('a | b')
  })

  test('step past the closing mark at the end of styled words', () => {
    expect(after('**bold|** b', toggleStyle('bold'))).toBe('**bold**| b')
  })

  test('take the style off text already in it, read from the tree', () => {
    expect(after('***[both]***', toggleStyle('italic'))).toBe('**[both]**')
    expect(after('<u>[under]</u>', toggleStyle('underline'))).toBe('[under]')
  })

  test('are on where the selection is in them', () => {
    const view = viewOf('x ***b|oth*** y')
    expect([hasStyle(view.state, 'bold'), hasStyle(view.state, 'italic'), hasStyle(view.state, 'code')]).toEqual([
      true,
      true,
      false,
    ])
    view.destroy()
  })
})

describe('blocks', () => {
  test('headings grow a level each time to the third, then go', () => {
    expect(after('ti|tle', heading)).toBe('# ti|tle')
    expect(after('### ti|tle', heading)).toBe('ti|tle')
  })

  test('quotes and lists go on every line the selection touches, and off when all have them', () => {
    expect(after('[one\ntwo]', quote)).toBe('> [one\n> two]')
    expect(after('> [one\n> two]', quote)).toBe('[one\ntwo]')
    expect(after('it|em', list)).toBe('- it|em')
    const view = viewOf('> q|')
    expect(inQuote(view.state)).toBe(true)
    view.destroy()
  })

  test('code blocks fence the lines, and lose their fences again', () => {
    expect(after('co|de', codeBlock)).toBe('```\nco|de\n```')
    expect(after('```\nco|de\n```', codeBlock)).toBe('co|de')
  })
})

describe('links', () => {
  test('wrap the word with the cursor where the address goes, and unwrap to their text', () => {
    expect(after('see th|is', link)).toBe('see [this](|)')
    const linked = new EditorView({
      parent: document.createElement('div'),
      state: EditorState.create({
        doc: 'see [this](u)',
        extensions: grammarLanguage(testGrammar),
        selection: EditorSelection.cursor(6),
      }),
    })
    expect(inLink(linked.state)).toBe(true)
    link(linked)
    expect(linked.state.doc.toString()).toBe('see this')
    linked.destroy()
  })
})
