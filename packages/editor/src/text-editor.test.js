import { describe, expect, test } from 'bun:test'

import { ensureSyntaxTree } from '@codemirror/language'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'

import { inlineDecorations, lookChanged, lookDecorations } from './decorations.js'
import { grammarLanguage } from './grammar-language.js'
import { counted, testGrammar, testLook } from './test-look.js'
import { textEditor } from './text-editor.js'

/**
 * A text held elsewhere, as a server holds it: it applies edits it is given and says which it includes
 * @param {string} initial - Its text
 * @returns {import('./text-editor.js').Text & {
 *   apply: (changes: readonly Readonly<{ from: number, to: number, insert: string }>[], id: string | undefined) => void,
 * }} The text, and applying an edit to it
 */
function heldText(initial) {
  let text = initial
  /** @type {string | undefined} */
  let includes = undefined
  /** @type {Set<() => void>} */
  const listeners = new Set()
  return {
    apply(changes, id) {
      for (const change of changes.toReversed()) {
        text = text.slice(0, change.from) + change.insert + text.slice(change.to)
      }
      includes = id ?? includes
      for (const listener of listeners) {
        listener()
      }
    },
    get: () => ({ includes, text }),
    watch(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

/**
 * An editor over a held text, keeping the edits it hands on
 * @param {string} initial - The text
 * @returns {Readonly<{
 *   held: ReturnType<typeof heldText>,
 *   edits: { changes: readonly Readonly<{ from: number, to: number, insert: string }>[], id: string }[],
 *   editor: ReturnType<typeof textEditor>,
 * }>} The text, the edits, and the editor
 */
function editorOver(initial) {
  const held = heldText(initial)
  /** @type {{ changes: readonly Readonly<{ from: number, to: number, insert: string }>[], id: string }[]} */
  const edits = []
  const editor = textEditor({
    edit(changes, id) {
      edits.push({ changes, id })
    },
    extensions: [
      grammarLanguage(testGrammar),
      lookDecorations(testLook(counted().counts)),
      EditorView.contentAttributes.of({ class: 'text' }),
    ],
    parent: document.createElement('div'),
    text: held,
  })
  return { edits, editor, held }
}

/**
 * Lets queued microtasks run
 * @returns {Promise<void>} When they have
 */
async function settled() {
  await Promise.resolve()
  await Promise.resolve()
}

/**
 * A state over a text, parsed to its end
 * @param {string} doc - The text
 * @returns {EditorState} The state
 */
function stateOf(doc) {
  const state = EditorState.create({
    doc,
    extensions: [grammarLanguage(testGrammar), lookDecorations(testLook(counted().counts))],
  })
  ensureSyntaxTree(state, doc.length, 1000)
  return state
}

/**
 * The wrappers a state draws
 * @param {EditorState} each - The state
 * @returns {string[]} Each wrapper's range
 */
function wrappersOf(each) {
  return each.facet(EditorView.blockWrappers).flatMap((source) => {
    /** @type {string[]} */
    const out = []
    if (typeof source !== 'function') {
      source.between(0, each.doc.length, (from, to) => {
        out.push(`${String(from)}-${String(to)}`)
      })
    }
    return out
  })
}

/**
 * What a decoration draws: its element, a piece, or its attributes
 * @param {unknown} spec - The decoration's spec
 * @returns {unknown} What it draws
 */
function shownBy(spec) {
  if (typeof spec !== 'object' || spec === null) {
    return undefined
  }
  if ('tagName' in spec) {
    return spec.tagName
  }
  return 'widget' in spec ? 'piece' : 'attributes' in spec ? spec.attributes : undefined
}

describe('textEditor', () => {
  test('hands each edit on with an id, as replacements in the text before it', () => {
    const { edits, editor } = editorOver('hello')
    editor.view.dispatch({
      changes: [
        { from: 0, insert: '>' },
        { from: 5, insert: '!' },
      ],
    })
    expect(edits).toEqual([
      {
        changes: [
          { from: 0, insert: '>', to: 0 },
          { from: 5, insert: '!', to: 5 },
        ],
        id: edits[0]?.id ?? '',
      },
    ])
    expect(editor.view.contentDOM.className).toContain('text')
    editor.stop()
  })

  test('an echo of an earlier edit never undoes what was typed since', async () => {
    const { edits, editor, held } = editorOver('ab')
    editor.view.dispatch({ changes: { from: 2, insert: 'c' } })
    editor.view.dispatch({ changes: { from: 3, insert: 'd' } })
    const first = edits[0]
    if (first !== undefined) {
      held.apply(first.changes, first.id)
    }
    await settled()
    expect(editor.view.state.doc.toString()).toBe('abcd')
    expect(edits).toHaveLength(2)
    editor.stop()
  })

  test("someone else's edit is laid under the edits not yet included", async () => {
    const { edits, editor, held } = editorOver('middle')
    editor.view.dispatch({ changes: { from: 6, insert: ' end' } })
    held.apply([{ from: 0, insert: 'start ', to: 0 }], undefined)
    await settled()
    expect(editor.view.state.doc.toString()).toBe('start middle end')
    const mine = edits[0]
    if (mine !== undefined) {
      held.apply([{ from: 12, insert: ' end', to: 12 }], mine.id)
    }
    await settled()
    expect(editor.view.state.doc.toString()).toBe('start middle end')
    expect(edits).toHaveLength(1)
    editor.stop()
  })

  test('gives the edits the text does not include, as one change from the text as last heard', async () => {
    const { edits, editor, held } = editorOver('one two')
    editor.view.dispatch({ changes: { from: 0, insert: 'zero ', to: 0 } })
    editor.view.dispatch({ changes: { from: 8, insert: '', to: 12 } })
    held.apply([{ from: 7, insert: ' three', to: 7 }], undefined)
    await settled()
    const mid = editor.unincluded()
    expect(mid.text).toBe('one two three')
    expect(mid.changes.apply(EditorState.create({ doc: mid.text }).doc).toString()).toBe('zero one three')
    const first = edits[0]
    if (first !== undefined) {
      held.apply(first.changes, first.id)
    }
    await settled()
    const after = editor.unincluded()
    expect(after.text).toBe('zero one two three')
    /** @type {string[]} */
    const deleted = []
    after.changes.iterChanges((from, to) => {
      deleted.push(after.text.slice(from, to))
    })
    expect(deleted).toEqual([' two'])
    editor.stop()
  })
})

describe('the editor drawing a look', () => {
  test('draws elements, dims marks and replaces pieces over the given ranges only', () => {
    const state = stateOf('a *b* `c`\n\nfar *away*')
    const { atomic, decorations } = inlineDecorations(state, [{ from: 0, to: 9 }], testLook(counted().counts))
    /** @type {string[]} */
    const drawn = []
    decorations.between(0, state.doc.length, (from, to, value) => {
      /** @type {unknown} */
      const spec = value.spec
      const shown = shownBy(spec)
      drawn.push(`${String(from)}-${String(to)}:${JSON.stringify(shown)}`)
    })
    expect(drawn.toSorted()).toEqual(['2-3:{"class":"mark"}', '2-5:"em"', '4-5:{"class":"mark"}', '6-9:"piece"'])
    expect(atomic.size).toBe(1)
  })

  test('wraps blocks, and keeps the wrappers of blocks an edit didn’t touch', () => {
    const state = stateOf('one\n\n> two\n\nthree')
    expect(wrappersOf(state).toSorted()).toEqual(['0-3', '12-17', '5-10', '5-10'])
    const next = state.update({ changes: { from: 17, insert: ' and four' } }).state
    ensureSyntaxTree(next, next.doc.length, 1000)
    expect(wrappersOf(next).toSorted()).toEqual(['0-3', '12-26', '5-10', '5-10'])
  })

  test('draws again when told the look changed, the text unchanged', () => {
    let shown = 'one'
    /** @type {import('./look.js').Look} */
    const look = {
      InlineCode: {
        piece: () => ({
          draw() {
            const made = document.createElement('span')
            made.textContent = shown
            return made
          },
          same: () => false,
        }),
        source: 'replaced',
      },
    }
    const doc = 'a `b` c'
    const view = new EditorView({
      parent: document.createElement('div'),
      state: EditorState.create({
        doc,
        extensions: [grammarLanguage(testGrammar), lookDecorations(look)],
      }),
    })
    ensureSyntaxTree(view.state, doc.length, 1000)
    view.dispatch({})
    expect(view.contentDOM.textContent).toContain('one')
    shown = 'two'
    view.dispatch({ effects: lookChanged.of(undefined) })
    expect(view.contentDOM.textContent).toContain('two')
    view.destroy()
  })

  test('wraps a block nested on its parent\u2019s line from the start of that line', () => {
    const state = stateOf('> > nested')
    expect(wrappersOf(state).toSorted()).toEqual(['0-10', '0-10', '0-10'])
  })
})
