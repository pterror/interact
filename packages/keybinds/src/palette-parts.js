/**
 * The palette's markup, which keys move through its matches, and $mod+K toggling it.
 */

import { isMac } from './binding-mods.js'
import { make } from './component-dom.js'

const PLACEHOLDER = 'Type a command...'

/**
 * Which keys in the search field move the active match, and where
 * @type {ReadonlyMap<string, 'down' | 'end' | 'home' | 'up'>}
 */
const MOVES = new Map([
  ['ArrowDown', 'down'],
  ['ArrowUp', 'up'],
  ['End', 'end'],
  ['Home', 'home'],
])

/**
 * The palette's dialog, holding the search field and the list
 * @param {HTMLInputElement} input - The search field
 * @param {HTMLUListElement} list - The list of matches
 * @returns {HTMLDivElement} The dialog
 */
function dialogOf(input, list) {
  const dialog = make('div', { className: 'palette__dialog', part: 'dialog' })
  dialog.setAttribute('role', 'dialog')
  dialog.setAttribute('aria-modal', 'true')
  dialog.append(input, list)
  return dialog
}

/**
 * The palette's markup: a backdrop, and a dialog holding the search field and the list of matches
 * @returns {Readonly<{ backdrop: HTMLDivElement, input: HTMLInputElement, list: HTMLUListElement, root: HTMLDivElement }>} The
 *   palette, and the parts it listens to
 */
function paletteMarkup() {
  const input = make('input', { className: 'palette__input', part: 'input' })
  Object.assign(input, { autocomplete: 'off', placeholder: PLACEHOLDER, spellcheck: false, type: 'text' })
  const list = make('ul', { className: 'palette__list', part: 'list' })
  list.setAttribute('role', 'listbox')
  const dialog = dialogOf(input, list)
  const backdrop = make('div', { className: 'palette__backdrop', part: 'backdrop' })
  const root = make('div', { className: 'palette', part: 'palette' })
  root.append(backdrop, dialog)
  return { backdrop, input, list, root }
}

/**
 * Makes $mod+K (Cmd on Mac, Ctrl elsewhere) open and close something, anywhere in the page
 * @param {Readonly<{ toggle: () => void }>} target - What opens and closes
 * @returns {() => void} A function that stops
 */
function toggleOnModK(target) {
  /**
   * Toggles on $mod+K
   * @param {KeyboardEvent} event - A key going down
   * @returns {void}
   */
  function toggle(event) {
    if ((isMac ? event.metaKey : event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault()
      target.toggle()
    }
  }
  globalThis.addEventListener('keydown', toggle)
  return () => {
    globalThis.removeEventListener('keydown', toggle)
  }
}

export { MOVES, PLACEHOLDER, paletteMarkup, toggleOnModK }
