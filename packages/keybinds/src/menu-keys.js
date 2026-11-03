/**
 * What a key does in a context menu: move the active item, choose it, or close the menu.
 */

/**
 * Where a key moves the active item
 * @typedef {'down' | 'end' | 'home' | 'up'} Move
 */

/**
 * Which keys move the active item, and where
 * @type {ReadonlyMap<string, Move>}
 */
const MOVES = new Map([
  ['ArrowDown', 'down'],
  ['ArrowUp', 'up'],
  ['End', 'end'],
  ['Home', 'home'],
])

/**
 * What a key does in a menu
 * @typedef {Move | 'choose' | 'close'} MenuAction
 */

/**
 * The keys that still work in a menu's search field, where the rest type
 * @type {ReadonlySet<string>}
 */
const SEARCH_KEYS = new Set(['ArrowDown', 'ArrowUp', 'Enter', 'Escape'])

/**
 * What a key does in a menu: move the active item, choose it, or close
 * @param {string} key - The key, as `KeyboardEvent.key` names it
 * @param {boolean} inSearch - Whether it was pressed in the menu's search field
 * @returns {MenuAction | undefined} What it does, if anything
 */
function menuKey(key, inSearch) {
  if (inSearch && !SEARCH_KEYS.has(key)) {
    return undefined
  }
  if (key === 'Enter') {
    return 'choose'
  }
  if (key === 'Escape') {
    return 'close'
  }
  return MOVES.get(key)
}

export { menuKey }
