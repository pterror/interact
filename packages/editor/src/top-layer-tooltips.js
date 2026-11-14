/**
 * An editor's tooltips in the top layer: every tooltip it shows (suggestions, hover tooltips, any an app adds through
 * `showTooltip`) is drawn inside one `manual` popover, open while the editor shows any, whose source is the editor.
 * The popover is an empty box at the window's top left corner, so CodeMirror places each tooltip against the window
 * as it would without it, `fixed` or `absolute`. It is inside the editor's element, so tooltips still inherit from the
 * editor and match the selectors they did. `textEditor` composes it in.
 */

import { ViewPlugin, showTooltip, tooltips } from '@codemirror/view'

/**
 * The popover an editor's tooltips are drawn in
 * @param {Document} document - The editor's document
 * @returns {HTMLElement} It, closed
 */
function container(document) {
  const element = document.createElement('div')
  element.popover = 'manual'
  // An empty box at the window's corner, drawing nothing of its own, whose overflow shows
  element.style.inset = '0 auto auto 0'
  element.style.margin = '0'
  element.style.border = '0'
  element.style.padding = '0'
  element.style.width = '0'
  element.style.height = '0'
  element.style.overflow = 'visible'
  // The browser gives a popover a colour of its own, which tooltips would inherit instead of the editor's
  element.style.color = 'inherit'
  return element
}

/**
 * Draws an editor's tooltips in a popover
 * @param {Document} [document] - The editor's document, if not the global one
 * @returns {import('@codemirror/state').Extension} The extension
 */
function topLayerTooltips(document = globalThis.document) {
  const parent = container(document)
  /**
   * Opens or closes the popover with the view's tooltips
   * @param {import('@codemirror/view').EditorView} view - The view
   * @returns {void}
   */
  const follow = (view) => {
    const shows = view.state.facet(showTooltip).some(Boolean)
    const open = parent.matches(':popover-open')
    if (shows && !open) {
      parent.showPopover({ source: view.dom })
    } else if (!shows && open) {
      parent.hidePopover()
    }
  }
  return [
    tooltips({ parent }),
    ViewPlugin.define((view) => {
      view.dom.append(parent)
      follow(view)
      return {
        destroy() {
          parent.remove()
        },
        update(update) {
          follow(update.view)
        },
      }
    }),
  ]
}

export { topLayerTooltips }
