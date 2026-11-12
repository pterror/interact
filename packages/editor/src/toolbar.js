/**
 * A toolbar for an editor: a button for each of a Watched list of tools, in an element the app places in space the
 * field always reserves, so it never moves the field. Unstyled. Each button's tooltip names its key; while `held`
 * holds (a modifier held, keybinds' `modifierHeld`), each button with a key shows it in `data-keys`. Which tools a
 * person has is the app's: the list it passes and keeps.
 */

import { drawButtons, showState } from './tool-buttons.js'
import { viewUpdates } from './view-updates.js'

/**
 * @typedef {import('./tool-buttons.js').Tool} Tool
 */

/**
 * A value, and hearing it change
 * @template T
 * @typedef {Readonly<{ get: () => T, watch: (listener: () => void) => () => void }>} Watched
 */

/**
 * @typedef {Readonly<{
 *   view: import('@codemirror/view').EditorView,
 *   tools: Watched<readonly Tool[]>,
 *   keyOf?: (id: string) => readonly string[] | undefined,
 *   held?: Watched<boolean>,
 * }>} ToolbarOptions
 */

/**
 * A toolbar
 * @param {ToolbarOptions} options - The editor, its tools, how each tool's key is shown (keybinds' `formatSteps` of
 *   its binding), and whether every key is shown now
 * @returns {Readonly<{ element: HTMLElement, stop: () => void }>} Its element (`role=toolbar`), and stopping
 */
function toolbar({ held, keyOf = () => undefined, tools, view }) {
  const element = view.dom.ownerDocument.createElement('div')
  element.setAttribute('role', 'toolbar')
  let buttons = drawButtons(element, view, tools.get(), keyOf)

  const showKeys = () => {
    const shown = held?.get() === true
    for (const { button, keys } of buttons) {
      if (shown && keys !== undefined && keys.length > 0) {
        button.dataset['keys'] = keys.join(' ')
      } else {
        delete button.dataset['keys']
      }
    }
  }
  showKeys()

  const stops = [
    tools.watch(() => {
      buttons = drawButtons(element, view, tools.get(), keyOf)
      showKeys()
    }),
    held?.watch(showKeys),
    viewUpdates(view, (update) => {
      for (const { button, tool } of buttons) {
        showState(button, tool, update.state)
      }
    }),
  ]
  return {
    element,
    stop() {
      for (const stop of stops) {
        stop?.()
      }
    },
  }
}

export { toolbar }
