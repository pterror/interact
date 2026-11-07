import { graphemes } from './typeahead.js'

/**
 * Which modifiers were held: Shift, and the platform's toggle modifier (Control, or Command on a Mac).
 * @typedef {Readonly<{ shift: boolean, toggle: boolean }>} Modifiers
 */

/**
 * What a key asks a listbox to do: move the active item by some rows or pages, or to the first or last item; toggle
 * the active item's selection; activate it; select everything; select from the anchor through the active item; select
 * from the active item to the first or last, moving there; or look for an item by what was typed.
 * @typedef {Readonly<
 *   | { kind: 'move', rows: number, pages: number }
 *   | { kind: 'first' }
 *   | { kind: 'last' }
 *   | { kind: 'toggle' }
 *   | { kind: 'activate' }
 *   | { kind: 'all' }
 *   | { kind: 'through' }
 *   | { kind: 'toFirst' }
 *   | { kind: 'toLast' }
 *   | { kind: 'type', character: string }
 * >} KeyAction
 */

/** @type {ReadonlyMap<string, KeyAction>} */
const KEYS = new Map([
  [' ', { kind: 'toggle' }],
  ['ArrowDown', { kind: 'move', pages: 0, rows: 1 }],
  ['ArrowUp', { kind: 'move', pages: 0, rows: -1 }],
  ['End', { kind: 'last' }],
  ['Enter', { kind: 'activate' }],
  ['Home', { kind: 'first' }],
  ['PageDown', { kind: 'move', pages: 1, rows: 0 }],
  ['PageUp', { kind: 'move', pages: -1, rows: 0 }],
])

/** @type {ReadonlyMap<string, KeyAction>} */
const TOGGLE_SHIFT_KEYS = new Map([
  ['End', { kind: 'toLast' }],
  ['Home', { kind: 'toFirst' }],
])

/**
 * What a key does in a listbox, if anything, as the WAI-ARIA Authoring Practices listbox pattern has it: the arrows,
 * Home, End and the page keys move the active item; Space toggles it, and with Shift selects from the anchor through
 * it; Enter activates it; the toggle modifier with A selects everything, and with Shift and Home or End selects from
 * the active item to the first or last; any other character looks for an item by what was typed.
 * @param {string} key - The key, as `KeyboardEvent.key` names it
 * @param {Modifiers} modifiers - What was held
 * @returns {KeyAction | undefined} What to do
 */
function keyAction(key, modifiers) {
  if (modifiers.toggle && modifiers.shift) {
    return TOGGLE_SHIFT_KEYS.get(key)
  }
  if (modifiers.toggle) {
    return key.toLowerCase() === 'a' ? { kind: 'all' } : undefined
  }
  if (key === ' ' && modifiers.shift) {
    return { kind: 'through' }
  }
  const known = KEYS.get(key)
  if (known !== undefined || graphemes(key).length !== 1) {
    return known
  }
  return { character: key, kind: 'type' }
}

export { keyAction }
