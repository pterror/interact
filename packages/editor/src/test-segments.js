/**
 * Segments over texts held in memory, as an app's stores hold them, for the tests: each text's port, the edits handed
 * on, a text heard from elsewhere, and every transaction the editor saw.
 */

import { EditorView } from '@codemirror/view'

import { segments } from './segments.js'

/**
 * A text as its store holds it
 * @typedef {{ text: string, includes: string | undefined, listeners: Set<() => void> }} Stored
 */

/**
 * One edit handed on
 * @typedef {Readonly<{ key: string, changes: readonly Readonly<{ from: number, to: number, insert: string }>[],
 *   id: string }>} Edited
 */

/**
 * An editor over segments
 * @param {readonly Readonly<{ key: string, text: string }>[]} initial - The segments
 * @param {(made: (transaction: import('@codemirror/state').Transaction) =>
 *   readonly import('./segments.js').Made<string>[]) => readonly import('@codemirror/state').Extension[]} [compose] -
 *   What else is composed in, given the segments each transaction made
 * @returns {Readonly<{
 *   s: ReturnType<typeof segments<string>>,
 *   view: EditorView,
 *   seen: import('@codemirror/state').Transaction[],
 *   edits: Edited[],
 *   texts: () => string[],
 *   hear: (key: string, text: string, includes?: string) => void,
 *   stored: Map<string, Stored>,
 * }>} The segments, their view, every transaction, every edit, each segment as `key:text`, a text heard from
 *   elsewhere, and the stores
 */
function over(initial, compose = () => []) {
  /** @type {Map<string, Stored>} */
  const stored = new Map(
    initial.map((each) => [each.key, { includes: undefined, listeners: new Set(), text: each.text }]),
  )
  /** @type {Edited[]} */
  const edits = []
  /** @type {import('@codemirror/state').Transaction[]} */
  const seen = []
  let made = 0
  /** @type {ReturnType<typeof segments<string>> | undefined} */
  let madeBy = undefined
  /** @type {ReturnType<typeof segments<string>>} */
  const s = segments({
    edit: (key, changes, id) => {
      edits.push({ changes, id, key })
    },
    extensions: [
      EditorView.updateListener.of((update) => {
        seen.push(...update.transactions)
      }),
      ...compose((transaction) => madeBy?.made(transaction) ?? []),
    ],
    initial: initial.map((each) => each.key),
    key: () => {
      made += 1
      return `+${String(made)}`
    },
    parent: document.createElement('div'),
    text(key) {
      /** @type {Stored} */
      const each = stored.get(key) ?? { includes: undefined, listeners: new Set(), text: '' }
      stored.set(key, each)
      return {
        get: () => ({ includes: each.includes, text: each.text }),
        watch(listener) {
          each.listeners.add(listener)
          return () => {
            each.listeners.delete(listener)
          }
        },
      }
    },
  })
  madeBy = s
  return {
    edits,
    hear(key, text, includes) {
      const each = stored.get(key)
      if (each !== undefined) {
        each.text = text
        each.includes = includes
        for (const listener of each.listeners) {
          listener()
        }
      }
    },
    s,
    seen,
    stored,
    texts: () => s.of(s.view.state).map((each) => `${each.key}:${s.view.state.sliceDoc(each.from, each.to)}`),
    view: s.view,
  }
}

export { over }
