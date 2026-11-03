/**
 * @import { Listbox } from './listbox.js'
 * @import { Modifiers } from './listbox-keys.js'
 */

/**
 * Keys a list takes from the text field that controls it (a combobox's, a palette's search field): the arrows and page
 * keys. Every other key edits the text: Home, End, and the left and right arrows move its cursor.
 */
const LIST_KEYS = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp'])
/** @type {Modifiers} */
const PLAIN = { shift: false, toggle: false }

/**
 * Passes a key typed in a text field on to the list it controls, if it is the list's.
 * @template T, F
 * @param {Listbox<T, F>} listbox - The list
 * @param {string} key - The key, as `KeyboardEvent.key` names it
 * @returns {boolean} Whether the list took it, so its default should be prevented
 */
function fieldListKey(listbox, key) {
  return LIST_KEYS.has(key) && listbox.key(key, PLAIN)
}

export { PLAIN, fieldListKey }
