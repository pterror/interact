/**
 * Which modifiers were held: Shift, and the platform's toggle modifier (Control, or Command on a Mac).
 * @typedef {Readonly<{ shift: boolean, toggle: boolean }>} Modifiers
 */

/**
 * What a key asks a listbox to do: move the active item by some rows or pages, or to the first or last item; toggle
 * the active item's selection; activate it; or select everything.
 * @typedef {Readonly<
 *   | { kind: 'move', rows: number, pages: number }
 *   | { kind: 'first' }
 *   | { kind: 'last' }
 *   | { kind: 'toggle' }
 *   | { kind: 'activate' }
 *   | { kind: 'all' }
 * >} KeyAction
 */

const BACK = -1
const FORWARD = 1
const NONE = 0

/** @type {ReadonlyMap<string, KeyAction>} */
const KEYS = new Map([
  [' ', { kind: 'toggle' }],
  ['ArrowDown', { kind: 'move', pages: NONE, rows: FORWARD }],
  ['ArrowUp', { kind: 'move', pages: NONE, rows: BACK }],
  ['End', { kind: 'last' }],
  ['Enter', { kind: 'activate' }],
  ['Home', { kind: 'first' }],
  ['PageDown', { kind: 'move', pages: FORWARD, rows: NONE }],
  ['PageUp', { kind: 'move', pages: BACK, rows: NONE }],
])

/**
 * What a key does in a listbox, if anything: the arrows, Home, End and the page keys move the active item, Space
 * toggles it, Enter activates it, and the toggle modifier with A selects everything.
 * @param {string} key - The key, as `KeyboardEvent.key` names it
 * @param {Modifiers} modifiers - What was held
 * @returns {KeyAction | undefined} What to do
 */
function keyAction(key, modifiers) {
  if (modifiers.toggle) {
    return key.toLowerCase() === 'a' ? { kind: 'all' } : undefined
  }
  return KEYS.get(key)
}

export { keyAction }
