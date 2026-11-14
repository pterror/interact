/**
 * A CodeMirror editor over a text that lives elsewhere (the server's state). Each edit is handed on with an id as it is
 * made. The text from elsewhere says which of this editor's edits it includes; the editor shows it with the edits it
 * doesn't include yet laid over it (rebased, as `@codemirror/collab` does), so an echo of an earlier edit, or someone
 * else's edit, never undoes what was typed since. Everything else it does is composed in by the app: the grammar
 * (`grammarLanguage`), the Look (`lookDecorations`), the text class it shares with the reader, keys, overlays. Its
 * tooltips are always in the top layer (`topLayerTooltips`).
 */

import { ChangeSet, EditorState, Transaction } from '@codemirror/state'
import { EditorView } from '@codemirror/view'

import { elsewhere, fromElsewhere } from './elsewhere.js'
import { changeBetween, rebase, replacementsOf } from './rebase.js'
import { topLayerTooltips } from './top-layer-tooltips.js'

/**
 * @typedef {import('./rebase.js').ChangeId} ChangeId
 * @typedef {import('./rebase.js').Text} Text
 * @typedef {import('./rebase.js').Edit} Edit
 */

/**
 * @typedef {Readonly<{
 *   parent: Element | DocumentFragment,
 *   text: Text,
 *   edit: Edit,
 *   extensions?: readonly import('@codemirror/state').Extension[],
 * }>} TextEditorOptions
 */

let made = 0

/**
 * The edits the text doesn't include yet, as one change from the text they were rebased onto last: `changes` applies to
 * `text` and gives what the editor shows. A text heard and not yet shown isn't in it yet.
 * @typedef {Readonly<{ text: string, changes: ChangeSet }>} Unincluded
 */

/**
 * An editor over a text
 * @param {TextEditorOptions} options - Where it goes, the text and where its edits go, and what the app composes in
 * @returns {Readonly<{ view: EditorView, stop: () => void, unincluded: () => Unincluded, rebase: (text: string) => ChangeId | undefined }>}
 *   The view; stopping, which destroys it; the edits the text doesn't include yet; and taking `text` as the text
 *   elsewhere while showing what it shows, so the difference is one edit the text doesn't include, whose id it gives
 *   (none when they don't differ). The text's next `get` is to be `text`, including none of the editor's edits.
 */
function textEditor({ edit, extensions = [], parent, text }) {
  made += 1
  const prefix = `${String(made)}:`
  let count = 0
  const initial = text.get()
  let confirmed = initial.text
  /** @type {import('./rebase.js').Pending[]} */
  let pending = []
  let scheduled = false

  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: initial.text,
      extensions: [
        EditorView.updateListener.of((update) => {
          for (const transaction of update.transactions) {
            if (!transaction.docChanged || fromElsewhere(transaction)) {
              continue
            }
            count += 1
            const id = `${prefix}${String(count)}`
            pending.push({ changes: transaction.changes, id })
            edit(replacementsOf(transaction.changes), id)
          }
        }),
        topLayerTooltips(parent.ownerDocument),
        extensions,
      ],
    }),
  })

  const receive = () => {
    scheduled = false
    const heard = text.get()
    const { other, pending: rest } = rebase(confirmed, pending, heard, (each) => view.state.toText(each))
    pending = rest
    confirmed = heard.text
    if (!other.empty) {
      view.dispatch({
        annotations: [elsewhere.of(true), Transaction.addToHistory.of(false)],
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
    rebase(other) {
      confirmed = other
      const shown = view.state.doc.toString()
      if (shown === other) {
        pending = []
        return undefined
      }
      count += 1
      const id = `${prefix}${String(count)}`
      pending = [{ changes: changeBetween(other, shown), id }]
      return id
    },
    unincluded() {
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
