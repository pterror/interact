/**
 * A CodeMirror editor over a text that lives elsewhere (the server's state). Each edit is handed on with an id as it is
 * made. The text from elsewhere says which of this editor's edits it includes; the editor shows it with the edits it
 * doesn't include yet laid over it (rebased, as `@codemirror/collab` does), so an echo of an earlier edit, or someone
 * else's edit, never undoes what was typed since. Everything else it does is composed in by the app: the grammar
 * (`grammarLanguage`), the Look (`lookDecorations`), the text class it shares with the reader, keys, overlays.
 */

import { Annotation, ChangeSet, EditorState, Transaction } from '@codemirror/state'
import { EditorView } from '@codemirror/view'

import { shared } from './shared.js'

/**
 * What identifies one edit made in an editor
 * @typedef {string} ChangeId
 */

/**
 * The text as it is elsewhere, and the latest of this editor's edits it includes (none if it includes none). Edits are
 * included in the order they were made.
 * @typedef {Readonly<{
 *   get: () => Readonly<{ text: string, includes: ChangeId | undefined }>,
 *   watch: (listener: () => void) => () => void,
 * }>} Text
 */

/**
 * One edit, handed on as it is made: replacements whose positions are all in the text before the edit
 * @typedef {(changes: readonly Readonly<{ from: number, to: number, insert: string }>[], id: ChangeId) => void} Edit
 */

/**
 * @typedef {Readonly<{
 *   parent: Element | DocumentFragment,
 *   text: Text,
 *   edit: Edit,
 *   extensions?: readonly import('@codemirror/state').Extension[],
 * }>} TextEditorOptions
 */

const fromElsewhere = Annotation.define()
let made = 0

/**
 * The replacements of a change set, in the text before it
 * @param {ChangeSet} changes - The changes
 * @returns {{ from: number, to: number, insert: string }[]} The replacements
 */
function replacementsOf(changes) {
  /** @type {{ from: number, to: number, insert: string }[]} */
  const out = []
  changes.iterChanges((from, to, _fromB, _toB, inserted) => {
    out.push({ from, insert: inserted.toString(), to })
  })
  return out
}

/**
 * The change from one text to another, as one replacement of what differs
 * @param {string} was - The first text
 * @param {string} now - The other
 * @returns {ChangeSet} The change
 */
function changeBetween(was, now) {
  const { end, start } = shared(was, now)
  if (start === was.length && start === now.length) {
    return ChangeSet.empty(was.length)
  }
  return ChangeSet.of({ from: start, insert: now.slice(start, now.length - end), to: was.length - end }, was.length)
}

/**
 * The edits the text doesn't include yet, as one change from the text as last heard: `changes` applies to `text` and
 * gives what the editor shows
 * @typedef {Readonly<{ text: string, changes: ChangeSet }>} Unincluded
 */

/**
 * An editor over a text
 * @param {TextEditorOptions} options - Where it goes, the text and where its edits go, and what the app composes in
 * @returns {Readonly<{ view: EditorView, stop: () => void, unincluded: () => Unincluded }>} The view; stopping, which
 *   destroys it; and the edits the text doesn't include yet
 */
function textEditor({ edit, extensions = [], parent, text }) {
  made += 1
  const prefix = `${String(made)}:`
  let count = 0
  const initial = text.get()
  let confirmed = initial.text
  /** @type {Readonly<{ id: ChangeId, changes: ChangeSet }>[]} */
  let pending = []
  let scheduled = false

  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: initial.text,
      extensions: [
        EditorView.updateListener.of((update) => {
          for (const transaction of update.transactions) {
            if (!transaction.docChanged || transaction.annotation(fromElsewhere) === true) {
              continue
            }
            count += 1
            const id = `${prefix}${String(count)}`
            pending.push({ changes: transaction.changes, id })
            edit(replacementsOf(transaction.changes), id)
          }
        }),
        extensions,
      ],
    }),
  })

  const receive = () => {
    scheduled = false
    const heard = text.get()
    const included = heard.includes === undefined ? 0 : pending.findIndex((each) => each.id === heard.includes) + 1
    let base = view.state.toText(confirmed)
    for (const each of pending.slice(0, included)) {
      base = each.changes.apply(base)
    }
    let other = changeBetween(base.toString(), heard.text)
    /** @type {Readonly<{ id: ChangeId, changes: ChangeSet }>[]} */
    const rest = []
    for (const each of pending.slice(included)) {
      rest.push({ changes: each.changes.map(other), id: each.id })
      // oxlint-disable-next-line unicorn/no-array-callback-reference, unicorn/no-array-method-this-argument -- ChangeSet.map takes changes, not a callback
      other = other.map(each.changes, true)
    }
    pending = rest
    confirmed = heard.text
    if (!other.empty) {
      view.dispatch({
        annotations: [fromElsewhere.of(true), Transaction.addToHistory.of(false)],
        changes: other,
      })
    }
  }

  const unwatch = text.watch(() => {
    if (!scheduled) {
      scheduled = true
      queueMicrotask(receive)
    }
  })

  return {
    stop() {
      unwatch()
      view.destroy()
    },
    unincluded() {
      if (scheduled) {
        receive()
      }
      let changes = ChangeSet.empty(confirmed.length)
      for (const each of pending) {
        changes = changes.compose(each.changes)
      }
      return { changes, text: confirmed }
    },
    view,
  }
}

export { textEditor }
