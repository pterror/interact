/**
 * A value kept with each segment of one editor (`segments`), by its key: a block's type, whether a to-do is done, a
 * row's state. It goes where its segment goes (moved, joined into another and brought back by undo); a segment split
 * off another starts with what the app derives from the other's, and one laid in from elsewhere with none (until
 * `put` gives it one); and changing it is a change like any other: one the person makes is in the same transaction as
 * the text changed with it, and one from elsewhere is kept out of undo.
 */

import { StateEffect, StateField, Transaction } from '@codemirror/state'

import { elsewhere, fromElsewhere } from './elsewhere.js'

/**
 * @typedef {import('@codemirror/state').EditorState} EditorState
 * @typedef {import('@codemirror/view').EditorView} EditorView
 */

/**
 * A segment a transaction made: split off `from`, or laid in from elsewhere (`from` none); `segments`' Made
 * @template K
 * @typedef {Readonly<{ key: K, from: K | undefined }>} Made
 */

/**
 * @template K, T
 * @typedef {Readonly<{
 *   made: (transaction: Transaction) => readonly Made<K>[],
 *   initial: readonly Readonly<{ key: K, value: T }>[],
 *   splitOff: (value: T) => T,
 * }>} SegmentDataOptions
 */

/**
 * Values kept with segments
 * @template K, T
 * @param {SegmentDataOptions<K, T>} options - The segments each transaction made (`segments`' `made`); the values the
 *   app's segments start with; and the value a segment split off another starts with, from the other's
 * @returns {Readonly<{
 *   extension: import('@codemirror/state').Extension,
 *   get: (state: EditorState, key: K) => T | undefined,
 *   change: (key: K, value: T | undefined) => StateEffect<Readonly<{ key: K, value: T | undefined }>>,
 *   put: (view: EditorView, key: K, value: T | undefined) => void,
 *   inverse: (transaction: Transaction) => readonly StateEffect<unknown>[],
 *   changed: (transaction: Transaction) => readonly K[],
 * }>} The extension; a segment's value in a state (none until it has one); the effect that changes one, for the
 *   app's own transactions; changing one as a change from elsewhere, which undo doesn't reach (before `segments`'
 *   `insert`, for the segment it lays in); the effects undoing a transaction's changes, for the history the app
 *   composes in (CodeMirror's `invertedEffects.of(inverse)`); and the keys whose values a transaction changed other
 *   than by `put`, for the app to save
 */
function segmentData({ initial, made, splitOff }) {
  /** @type {import('@codemirror/state').StateEffectType<Readonly<{ key: K, value: T | undefined }>>} */
  const assign = StateEffect.define()

  const field = StateField.define({
    /** @returns {ReadonlyMap<K, T>} The values the app gave */
    create: () => new Map(initial.map((each) => [each.key, each.value])),
    /**
     * @param {ReadonlyMap<K, T>} value - The values before
     * @param {Transaction} transaction - The transaction
     * @returns {ReadonlyMap<K, T>} The values after
     */
    update(value, transaction) {
      const assigned = transaction.effects.filter((effect) => effect.is(assign))
      const splits = made(transaction).filter((each) => each.from !== undefined && !value.has(each.key))
      if (assigned.length === 0 && splits.length === 0) {
        return value
      }
      const next = new Map(value)
      for (const { from, key } of splits) {
        const was = from === undefined ? undefined : value.get(from)
        if (was !== undefined) {
          next.set(key, splitOff(was))
        }
      }
      for (const effect of assigned) {
        if (effect.value.value === undefined) {
          next.delete(effect.value.key)
        } else {
          next.set(effect.value.key, effect.value.value)
        }
      }
      return next
    },
  })

  /** @type {(state: EditorState, key: K) => T | undefined} */
  const get = (state, key) => state.field(field).get(key)

  return {
    change: (key, value) => assign.of({ key, value }),
    extension: field,
    changed(transaction) {
      if (fromElsewhere(transaction)) {
        return []
      }
      const was = transaction.startState.field(field)
      const now = transaction.state.field(field)
      if (was === now) {
        return []
      }
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
