/**
 * The context menus' markup: a backdrop that closes the menu, and the menu holding its list, with a search field above
 * it in the scored menu.
 */

import { OVERLAY_STYLE, make, styleOf } from './component-dom.js'

const MENU_STYLE = `${OVERLAY_STYLE}
@layer keybinds.structure {
  :where(.context-menu__backdrop) { position: fixed; inset: 0; }
  :where(.context-menu__more-row) { list-style: none; cursor: pointer; padding: 4px 8px; opacity: 0.6; font-size: 0.85em; }
  :where(.context-menu__more-row:hover, .context-menu__more-row:focus) { opacity: 1; }
}`

/**
 * A menu's parts: the backdrop, the box holding its list, and the list
 * @typedef {Readonly<{ backdrop: HTMLDivElement, box: HTMLDivElement, list: HTMLUListElement }>} MenuParts
 */

/**
 * The search field above the scored menu's list, which takes what's typed as it is: no autocomplete or spellcheck
 * @returns {HTMLInputElement} The field
 */
function menuSearch() {
  const input = make('input', { className: 'context-menu__search', part: 'search' })
  input.autocomplete = 'off'
  input.placeholder = 'Search...'
  input.spellcheck = false
  input.type = 'text'
  return input
}

/**
 * Builds a menu's shadow DOM: its styles, a backdrop, and the box holding the list, after anything given to go first
 * @param {ShadowRoot} shadow - The menu's shadow root
 * @param {readonly HTMLElement[]} [above] - What goes in the box above the list
 * @returns {MenuParts} The parts it listens to and places
 */
function menuMarkup(shadow, above = []) {
  const backdrop = make('div', { className: 'context-menu__backdrop', part: 'backdrop' })
  const list = make('ul', { className: 'context-menu__list', part: 'list' })
  list.setAttribute('role', 'menu')
  const box = make('div', { className: 'context-menu', part: 'context-menu' })
  box.append(...above, list)
  shadow.append(styleOf(MENU_STYLE), backdrop, box)
  return { backdrop, box, list }
}

/**
 * Makes clicking or right-clicking the backdrop close the menu
 * @param {HTMLDivElement} backdrop - The backdrop
 * @param {() => void} close - Closes the menu
 * @returns {void}
 */
function closeOnBackdrop(backdrop, close) {
  backdrop.addEventListener('click', close)
  backdrop.addEventListener('contextmenu', (event) => {
    event.preventDefault()
    close()
  })
}

/**
 * Focuses the search field, or on a touch screen the list: focusing the field there would bring up the on-screen
 * keyboard over the menu
 * @param {HTMLInputElement} search - The search field
 * @param {HTMLUListElement} list - The list
 * @returns {void}
 */
function focusOnOpen(search, list) {
  const touch = 'matchMedia' in globalThis && globalThis.matchMedia('(pointer: coarse)').matches
  if (touch) {
    list.focus()
  } else {
    search.focus()
  }
}

export { closeOnBackdrop, focusOnOpen, menuMarkup, menuSearch }
