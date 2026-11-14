/**
 * One editor over many texts: the document is the texts in order, each a segment with a key, one line break between
 * two. Segments are tracked through every change, so the app can save each text where it lives (a block, a message, a
 * cell) and lay a change made elsewhere into the segment it belongs to. Enter splits a segment; deleting the line
 * break between two joins them, and undoing or redoing that brings the joined segment back with its key.
 */

import { Annotation, EditorSelection, StateEffect, StateField, Transaction } from '@codemirror/state'
import { Decoration, EditorView, keymap } from '@codemirror/view'

/**
 * What identifies a segment; opaque. The app's, for segments it gives; this module's, for those a split makes.
 * @typedef {string} SegmentKey
 */

/**
 * A segment where it is in the document: its text is from `from` to `to`
 * @typedef {Readonly<{ key: SegmentKey, from: number, to: number }>} Segment
 */

/**
 * A segment's key and where the line break before its text is: -1 for the first, which has none
 * @typedef {Readonly<{ key: SegmentKey, at: number }>} Mark
 */

/** How many joined segments are kept for undo */
const KEPT = 200

const elsewhere = Annotation.define()

/**
 * A new line break at `at`, in the document after the transaction carrying it, starting a segment `key`; with `before`,
 * the new segment is the one before it, and the segment it split keeps the text after
 * @type {import('@codemirror/state').StateEffectType<Readonly<{ at: number, key: SegmentKey, before: boolean }>>}
 */
const splitAt = StateEffect.define({ map: (value, changes) => ({ ...value, at: changes.mapPos(value.at, -1) }) })

/** @type {import('@codemirror/state').StateEffectType<SegmentKey>} */
const take = StateEffect.define()

/**
 * Whether a transaction came from `insert`, `remove` or `replace` (a text from elsewhere), not from typing
 * @param {Transaction} transaction - The transaction
 * @returns {boolean} Whether it did
 */
function fromElsewhere(transaction) {
  return transaction.annotation(elsewhere) === true
}

/**
 * A line break's new place after changes, or none when it was deleted
 * @param {import('@codemirror/state').ChangeDesc} changes - The changes
 * @param {number} at - Where it was
 * @returns {number | undefined} Where it is
 */
function moved(changes, at) {
  const from = changes.mapPos(at, 1)
  const to = changes.mapPos(at + 1, -1)
  return to - from === 1 ? from : undefined
}

/**
 * The mark of the segment a position is in
 * @param {readonly Mark[]} marks - The marks, in order
 * @param {number} pos - The position
 * @returns {Mark | undefined} Its segment's mark
 */
function ownerOf(marks, pos) {
  /** @type {Mark | undefined} */
  let owner = undefined
  for (const mark of marks) {
    if (mark.at < pos) {
      owner = mark
    }
  }
  return owner
}

/**
 * Segments over a document
 * @param {Readonly<{ initial: readonly Readonly<{ key: SegmentKey, text: string }>[] }>} options - The texts it starts
 *   with, in order
 * @returns {Readonly<{
 *   doc: string,
 *   extension: import('@codemirror/state').Extension,
 *   of: (state: import('@codemirror/state').EditorState) => Segment[],
 *   split: import('@codemirror/view').Command,
 *   insert: (view: EditorView, after: SegmentKey | undefined, key: SegmentKey, text: string) => void,
 *   remove: (view: EditorView, key: SegmentKey) => void,
 *   replace: (view: EditorView, key: SegmentKey, changes: readonly Readonly<{ from: number, to: number, insert: string }>[]) => void,
 * }>} The document to start the editor with; the extension; the segments in a state, in order; Enter's command; and,
 *   each as a text from elsewhere that undo doesn't reach: laying a segment in after another (first, with none), taking
 *   one out, and changing one's text (positions in its text)
 */
function segments({ initial }) {
  let made = 0
  const keyed = () => {
    made += 1
    return `+${String(made)}`
  }

  /** @type {Mark[]} */
  const start = []
  let at = -1
  for (const each of initial) {
    start.push({ at, key: each.key })
    at += each.text.length + 1
  }
  if (start.length === 0) {
    start.push({ at: -1, key: keyed() })
  }

  /**
   * The marks, and the segments joins took out, kept for an undo, at where their line break was
   * @typedef {Readonly<{ marks: readonly Mark[], joined: readonly Mark[] }>} Tracked
   */
  const field = StateField.define({
    /** @returns {Tracked} The marks it starts with */
    create: () => ({ joined: [], marks: start }),
    /**
     * @param {Tracked} value - The marks before
     * @param {Transaction} transaction - The transaction
     * @returns {Tracked} The marks after
     */
    update(value, transaction) {
      if (!transaction.docChanged && transaction.effects.length === 0) {
        return value
      }
      const { changes } = transaction
      /** @type {Mark[]} */
      const marks = []
      /** @type {Mark[]} */
      const joined = value.joined.map((each) => ({ at: changes.mapPos(each.at, -1), key: each.key }))
      /** @type {Mark[]} */
      const joinedNow = []
      for (const mark of value.marks) {
        const now = mark.at < 0 ? mark.at : moved(changes, mark.at)
        if (now === undefined) {
          joinedNow.push({ at: changes.mapPos(mark.at, -1), key: mark.key })
        } else {
          marks.push({ at: now, key: mark.key })
        }
      }
      if (transaction.isUserEvent('undo') || transaction.isUserEvent('redo')) {
        changes.iterChanges((_fromA, _toA, fromB, toB, inserted) => {
          const breaks = [...inserted.toString().matchAll(/\n/gu)].map((found) => fromB + found.index)
          for (const back of joined.filter((each) => each.at >= fromB && each.at <= toB)) {
            const pos = breaks.shift()
            if (pos === undefined) {
              break
            }
            joined.splice(joined.indexOf(back), 1)
            marks.push({ at: pos, key: back.key })
          }
        })
      }
      const doc = transaction.newDoc
      for (const effect of transaction.effects) {
        if (effect.is(splitAt)) {
          const pos = effect.value.at
          if (doc.sliceString(pos, pos + 1) !== '\n' || marks.some((mark) => mark.at === pos)) {
            continue
          }
          const owner = effect.value.before ? ownerOf(marks, pos) : undefined
          if (owner === undefined) {
            marks.push({ at: pos, key: effect.value.key })
          } else {
            marks.splice(marks.indexOf(owner), 1, { at: owner.at, key: effect.value.key }, { at: pos, key: owner.key })
          }
        } else if (effect.is(take)) {
          const index = marks.findIndex((mark) => mark.key === effect.value)
          const taken = marks[index]
          if (taken === undefined) {
            const gone = joinedNow.findIndex((each) => each.key === effect.value)
            if (gone !== -1) {
              joinedNow.splice(gone, 1)
            }
          } else if (taken.at < 0) {
            const next = joinedNow.shift()
            if (next !== undefined) {
              marks.splice(index, 1, { at: -1, key: next.key })
            }
          } else {
            marks.splice(index, 1)
          }
        }
      }
      marks.sort((a, b) => a.at - b.at)
      return { joined: [...joined, ...joinedNow].slice(-KEPT), marks }
    },
  })

  /** @type {(state: import('@codemirror/state').EditorState) => Segment[]} */
  const of = (state) => {
    const { marks } = state.field(field)
    return marks.map((mark, index) => ({
      from: mark.at + 1,
      key: mark.key,
      to: marks[index + 1]?.at ?? state.doc.length,
    }))
  }

  const lines = EditorView.decorations.compute([field, 'doc'], (state) =>
    Decoration.set(
      of(state).map((each) =>
        Decoration.line({ attributes: { 'data-segment': each.from === each.to ? 'empty' : '' } }).range(each.from),
      ),
      true,
    ),
  )

  /** @type {import('@codemirror/view').Command} */
  const split = (view) => {
    const { state } = view
    const range = state.selection.main
    const owner = of(state).find((each) => each.from <= range.from && range.from <= each.to)
    const before = owner !== undefined && range.empty && range.from === owner.from && owner.to > owner.from
    view.dispatch({
      changes: { from: range.from, insert: '\n', to: range.to },
      effects: splitAt.of({ at: range.from, before, key: keyed() }),
      scrollIntoView: true,
      selection: EditorSelection.cursor(range.from + 1),
      userEvent: 'input',
    })
    return true
  }

  const quiet = [elsewhere.of(true), Transaction.addToHistory.of(false)]

  return {
    doc: initial.map((each) => each.text).join('\n'),
    extension: [field, lines, keymap.of([{ key: 'Enter', run: split }])],
    insert(view, after, key, text) {
      const prior = after === undefined ? undefined : of(view.state).find((each) => each.key === after)
      if (prior === undefined) {
        view.dispatch({
          annotations: quiet,
          changes: { from: 0, insert: `${text}\n` },
          effects: splitAt.of({ at: text.length, before: true, key }),
        })
        return
      }
      view.dispatch({
        annotations: quiet,
        changes: { from: prior.to, insert: `\n${text}` },
        effects: splitAt.of({ at: prior.to, before: false, key }),
      })
    },
    of,
    remove(view, key) {
      const all = of(view.state)
      const index = all.findIndex((each) => each.key === key)
      const segment = all[index]
      if (segment === undefined || all.length === 1) {
        return
      }
      const from = index === 0 ? segment.from : segment.from - 1
      const to = index === 0 ? segment.to + 1 : segment.to
      view.dispatch({ annotations: quiet, changes: { from, insert: '', to }, effects: take.of(key) })
    },
    replace(view, key, changes) {
      const segment = of(view.state).find((each) => each.key === key)
      if (segment === undefined) {
        return
      }
      view.dispatch({
        annotations: quiet,
        changes: changes.map((each) => ({
          from: segment.from + each.from,
          insert: each.insert,
          to: segment.from + each.to,
        })),
      })
    },
    split,
  }
}

export { fromElsewhere, segments }
