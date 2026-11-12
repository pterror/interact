/**
 * The tools beside the selection: a button for each, in list's `popover`, shown below the selection while text is
 * selected and the editor has focus. Unstyled. Its element goes inside the editor's own, and the popover puts it in
 * the top layer.
 */

import { popover } from '@pterror/interact-list/popover'

import { drawButtons, showState } from './tool-buttons.js'
import { viewUpdates } from './view-updates.js'

/**
 * @typedef {import('./tool-buttons.js').Tool} Tool
 * @typedef {import('@codemirror/view').EditorView} EditorView
 */

/**
 * Whether the bar is shown for a view
 * @param {EditorView} view - The view
 * @returns {boolean} Whether text is selected in it and it has focus
 */
function shownFor(view) {
  return view.hasFocus && !view.state.selection.main.empty
}

/**
 * The tools beside the selection
 * @param {Readonly<{ view: EditorView, tools: readonly Tool[] }>} options - The editor and the tools
 * @returns {Readonly<{
 *   element: HTMLElement,
 *   open: Readonly<{ get: () => boolean, watch: (listener: () => void) => () => void }>,
 *   buttons: Readonly<{ get: () => readonly import('./tool-buttons.js').Drawn[], watch: (listener: () => void) => () => void }>,
 *   stop: () => void,
 * }>} Its element (`role=toolbar`), whether it is shown, its buttons (which don't change), and stopping
 */
function selectionBar({ tools, view }) {
  const element = view.dom.ownerDocument.createElement('div')
  element.setAttribute('role', 'toolbar')
  const buttons = drawButtons(element, view, tools)
  view.dom.append(element)
  let shown = shownFor(view)
  /** @type {Set<() => void>} */
  const listeners = new Set()
  const open = {
    get: () => shown,
    /**
     * @param {() => void} listener - Hears it change
     * @returns {() => void} Stops hearing it
     */
    watch(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
  const anchor = {
    getBoundingClientRect() {
      const { from, to } = view.state.selection.main
      const start = view.coordsAtPos(from, 1)
      const end = view.coordsAtPos(to, -1)
      if (start === null || end === null) {
        return view.dom.getBoundingClientRect()
      }
      return {
        bottom: Math.max(start.bottom, end.bottom),
        left: Math.min(start.left, end.left),
        right: Math.max(start.right, end.right),
        top: Math.min(start.top, end.top),
      }
    },
  }
  const stopPopover = popover({ anchor, element, open })
  const stopUpdates = viewUpdates(view, (update) => {
    for (const { button, tool } of buttons) {
      showState(button, tool, update.state)
    }
    const now = shownFor(update.view)
    if (now !== shown || (now && update.selectionSet)) {
      shown = now
      for (const listener of listeners) {
        listener()
      }
    }
  })
  return {
    buttons: { get: () => buttons, watch: () => () => undefined },
    element,
    open,
    stop() {
      stopUpdates()
      stopPopover()
      listeners.clear()
      element.remove()
    },
  }
}

export { selectionBar }
