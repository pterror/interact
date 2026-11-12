/**
 * Overlays drawn in an editor: each overlay's ranges over the visible part of the text, as mark decorations, asked for
 * again when the text, the visible part or the overlay changes. An answer's positions are in the text as it was when
 * it was asked for, and are moved through the edits made since. Only the answer to the latest question is drawn.
 */

import { syntaxTree } from '@codemirror/language'
import { ChangeSet, StateEffect } from '@codemirror/state'
import { Decoration, ViewPlugin } from '@codemirror/view'

import { settle } from './later.js'

/**
 * @typedef {import('./reader.js').Overlay} Overlay
 * @typedef {import('./reader.js').Range} Range
 */

/** @type {import('@codemirror/state').StateEffectType<undefined>} */
const answered = StateEffect.define()

/**
 * The mark decorations for an overlay's ranges
 * @param {readonly Range[]} ranges - The ranges, moved into the current text
 * @returns {import('@codemirror/view').DecorationSet} The decorations
 */
function marksOf(ranges) {
  return Decoration.set(
    ranges
      .filter((range) => range.from < range.to)
      .map((range) =>
        Decoration.mark({ attributes: { ...range.attributes, class: range.class } }).range(range.from, range.to),
      ),
    true,
  )
}

/**
 * Draws overlays in an editor
 * @param {readonly Overlay[]} list - The overlays
 * @returns {import('@codemirror/state').Extension} The extension that draws them
 */
function overlays(list) {
  return list.map((overlay) =>
    ViewPlugin.define(
      (view) => {
        let decorations = Decoration.none
        let question = 0
        let since = ChangeSet.empty(view.state.doc.length)
        let updating = true
        let stopped = false

        const ask = () => {
          question += 1
          const asked = question
          since = ChangeSet.empty(view.state.doc.length)
          const { from, to } = view.viewport
          const { state } = view
          const text = {
            read: (/** @type {number} */ start, /** @type {number} */ end) => state.sliceDoc(start, end),
            tree: syntaxTree(state),
          }
          settle(overlay.ranges(from, to, text), (ranges) => {
            if (asked !== question) {
              return
            }
            decorations = marksOf(
              ranges.map((range) => ({ ...range, from: since.mapPos(range.from, 1), to: since.mapPos(range.to, -1) })),
            )
            if (!updating && !stopped) {
              view.dispatch({ effects: answered.of(undefined) })
            }
          })
        }
        ask()
        updating = false
        const stop = overlay.watch(() => {
          ask()
        })
        return {
          get decorations() {
            return decorations
          },
          destroy() {
            stopped = true
            stop()
          },
          update(update) {
            updating = true
            if (update.docChanged) {
              since = since.compose(update.changes)
              // oxlint-disable-next-line unicorn/no-array-callback-reference -- RangeSet.map takes changes, not a callback
              decorations = decorations.map(update.changes)
            }
            if (update.docChanged || update.viewportChanged) {
              ask()
            }
            updating = false
          },
        }
      },
      { decorations: (value) => value.decorations },
    ),
  )
}

export { overlays }
