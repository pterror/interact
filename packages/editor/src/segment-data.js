/**
 * A value kept with each segment of one editor (`segments`), by its key: a block's type, whether a to-do is done, a
 * row's state. It goes where its segment goes (moved, joined into another and brought back by undo), a segment that
 * Enter splits off another starts with what the app derives from the other's, and changing it is a change like any
 * other: one the person makes is in the same transaction as the text changed with it, and one from elsewhere is kept
 * out of undo.
 */

import { Annotation, StateEffect, StateField, Transaction } from '@codemirror/state'

/**
 * @typedef {import('@codemirror/state').EditorState} EditorState
 * @typedef {import('@codemirror/view').EditorView} EditorView
 */

/**
 * A segment where it is in the document (`segments`' Segment)
 * @typedef {Readonly<{ key: string, from: number, to: number }>} Segment
 */

const elsewhere = Annotation.define()

/**
 * The segment holding a position
 * @param {readonly Segment[]} all - The segments, in order
 * @param {number} pos - The position
 * @returns {Segment | undefined} The one whose text, or the line break after it, holds it
 */
function holding(all, pos) {
  return all.find((each) => each.from <= pos && pos <= each.to)
}

/**
 * Values kept with segments
 * @template T
 * @param {Readonly<{
 *   of: (state: EditorState) => readonly Segment[],
 *   initial: readonly Readonly<{ key: string, value: T }>[],
 *   split: (value: T) => T,
 * }>} options - The segments in a state, in order (`segments`' `of`); the values the app's segments start with; and
 *   the value a segment split off another starts with, from the other's
 * @returns {Readonly<{
 *   extension: import('@codemirror/state').Extension,
 *   get: (state: EditorState, key: string) => T | undefined,
 *   change: (key: string, value: T | undefined) => StateEffect<Readonly<{ key: string, value: T | undefined }>>,
 *   put: (view: EditorView, key: string, value: T | undefined) => void,
 *   inverse: (transaction: Transaction) => readonly StateEffect<unknown>[],
 *   changed: (transaction: Transaction) => readonly string[],
 * }>} The extension; a segment's value in a state (none until it has one); the effect that changes one, for the
 *   app's own transactions; changing one as a change from elsewhere, which undo doesn't reach (before `segments`'
 *   `insert`, for the segment it lays in); the effects undoing a transaction's changes, for the history the app
 *   composes in (CodeMirror's `invertedEffects.of(inverse)`); and the keys whose values a transaction changed other
 *   than by `put`, for the app to save
 */
function segmentData({ initial, of, split }) {
  /** @type {import('@codemirror/state').StateEffectType<Readonly<{ key: string, value: T | undefined }>>} */
  const assign = StateEffect.define()

  const field = StateField.define({
    /** @returns {ReadonlyMap<string, T>} The values the app gave */
    create: () => new Map(initial.map((each) => [each.key, each.value])),
    /**
     * @param {ReadonlyMap<string, T>} value - The values before
     * @param {Transaction} transaction - The transaction
     * @returns {ReadonlyMap<string, T>} The values after
     */
    update(value, transaction) {
      const assigned = transaction.effects.filter((effect) => effect.is(assign))
      if (!transaction.docChanged && assigned.length === 0) {
        return value
      }
      const next = new Map(value)
      for (const effect of assigned) {
        if (effect.value.value === undefined) {
          next.delete(effect.value.key)
        } else {
          next.set(effect.value.key, effect.value.value)
        }
      }
      if (transaction.docChanged) {
        const before = of(transaction.startState)
        const known = new Set(before.map((each) => each.key))
        /** @type {Map<number, number>} */
        const breaks = new Map()
        transaction.changes.iterChanges((fromA, _toA, fromB, _toB, inserted) => {
          for (const found of inserted.toString().matchAll(/\n/gu)) {
            breaks.set(fromB + found.index, fromA)
          }
        })
        for (const segment of of(transaction.state)) {
          if (next.has(segment.key) || known.has(segment.key)) {
            continue
          }
          const was = breaks.get(segment.from - 1) ?? breaks.get(segment.to)
          const source = was === undefined ? undefined : holding(before, was)
          const from = source === undefined ? undefined : value.get(source.key)
          if (from !== undefined) {
            next.set(segment.key, split(from))
          }
        }
      }
      return next
    },
  })

  /** @type {(state: EditorState, key: string) => T | undefined} */
  const get = (state, key) => state.field(field).get(key)

  return {
    change: (key, value) => assign.of({ key, value }),
    extension: field,
    changed(transaction) {
      if (transaction.annotation(elsewhere) === true) {
        return []
      }
      const was = transaction.startState.field(field)
      const now = transaction.state.field(field)
      return [...new Set([...was.keys(), ...now.keys()])].filter((key) => was.get(key) !== now.get(key))
    },
    get,
    inverse(transaction) {
      return transaction.effects
        .filter((effect) => effect.is(assign))
        .map((effect) => assign.of({ key: effect.value.key, value: get(transaction.startState, effect.value.key) }))
    },
    put(view, key, value) {
      view.dispatch({
        annotations: [elsewhere.of(true), Transaction.addToHistory.of(false)],
        effects: assign.of({ key, value }),
      })
    },
  }
}

export { segmentData }
