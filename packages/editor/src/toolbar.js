/**
 * A toolbar for an editor: a button for each of a Watched list of tools, in an element the app places in space the
 * field always reserves, so it never moves the field. Unstyled. Its buttons are a Watched, for what the app composes
 * onto them (`keyHints`). Which tools a person has is the app's: the list it passes and keeps.
 */

import { drawButtons, showState } from './tool-buttons.js'
import { viewUpdates } from './view-updates.js'

/**
 * @typedef {import('./tool-buttons.js').Tool} Tool
 * @typedef {import('./tool-buttons.js').Drawn} Drawn
 */

/**
 * A value, and hearing it change
 * @template T
 * @typedef {Readonly<{ get: () => T, watch: (listener: () => void) => () => void }>} Watched
 */

/**
 * A toolbar
 * @param {Readonly<{ view: import('@codemirror/view').EditorView, tools: Watched<readonly Tool[]> }>} options - The
 *   editor and its tools
 * @returns {Readonly<{ element: HTMLElement, buttons: Watched<readonly Drawn[]>, stop: () => void }>} Its element
 *   (`role=toolbar`), the buttons it draws, and stopping
 */
function toolbar({ tools, view }) {
  const element = view.dom.ownerDocument.createElement('div')
  element.setAttribute('role', 'toolbar')
  let buttons = drawButtons(element, view, tools.get())
  /** @type {Set<() => void>} */
  const listeners = new Set()

  const stops = [
    tools.watch(() => {
      buttons = drawButtons(element, view, tools.get())
      for (const listener of listeners) {
        listener()
      }
    }),
    viewUpdates(view, (update) => {
      for (const { button, tool } of buttons) {
        showState(button, tool, update.state)
      }
    }),
  ]
  return {
    buttons: {
      get: () => buttons,
      watch(listener) {
        listeners.add(listener)
        return () => {
          listeners.delete(listener)
        }
      },
    },
    element,
    stop() {
      for (const stop of stops) {
        stop()
      }
      listeners.clear()
    },
  }
}

export { toolbar }
