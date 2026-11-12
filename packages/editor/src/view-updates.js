/**
 * Hearing every update of an editor made elsewhere, until stopped
 */

import { Compartment, StateEffect } from '@codemirror/state'
import { EditorView } from '@codemirror/view'

/**
 * Hears each update of a view
 * @param {EditorView} view - The view
 * @param {(update: import('@codemirror/view').ViewUpdate) => void} listener - Hears each update
 * @returns {() => void} Stops hearing them
 */
function viewUpdates(view, listener) {
  const slot = new Compartment()
  view.dispatch({ effects: StateEffect.appendConfig.of(slot.of(EditorView.updateListener.of(listener))) })
  return () => {
    if (slot.get(view.state) !== undefined) {
      view.dispatch({ effects: slot.reconfigure([]) })
    }
  }
}

export { viewUpdates }
