/**
 * Opening the cheatsheet by holding a modifier on its own: it shows while the modifier is held, tapping the modifier
 * twice keeps it open, and tapping twice again, Escape or a click outside closes it.
 */

import { isMac } from './binding-mods.js'
import { onModifierHold, onModifierTaps } from './modifiers.js'

/**
 * Long enough that pausing with the modifier down to find the rest of a shortcut doesn't open it
 */
const DEFAULT_DELAY = 1000

/**
 * What the trigger opens and closes
 * @typedef {Readonly<{ close: () => void, isOpen: () => boolean, onClose: (closed: () => void) => () => void,
 *   setOpen: (open: boolean) => void }>} Sheet
 */

/**
 * The modifier to hold, as its key is named: "$mod" (the default) is Meta on Mac and Control elsewhere, as in bindings
 * @param {string | null} key - The `trigger-key` attribute
 * @returns {string} The key's name
 */
function modifierOf(key) {
  if (key === null || key === '' || key.toLowerCase() === '$mod') {
    return isMac ? 'Meta' : 'Control'
  }
  return key
}

/**
 * How long to hold the modifier before opening
 * @param {string | null} delay - The `trigger-delay` attribute, in ms
 * @returns {number} The delay, the default when it isn't a number
 */
function delayOf(delay) {
  const ms = Number(delay ?? DEFAULT_DELAY)
  return Number.isFinite(ms) ? ms : DEFAULT_DELAY
}

/**
 * Starts opening a sheet by holding a modifier
 * @param {Sheet} sheet - What opens
 * @param {Readonly<{ delay: string | null, key: string | null }>} attributes - The `trigger-key` and `trigger-delay`
 *   attributes
 * @returns {() => void} A function that stops
 */
function holdToOpen(sheet, { delay, key }) {
  const modifier = modifierOf(key)
  let pinned = false
  const unhold = onModifierHold(
    modifier,
    (held) => {
      if (!pinned) {
        sheet.setOpen(held)
      }
    },
    { delay: delayOf(delay) },
  )
  const untap = onModifierTaps(modifier, () => {
    pinned = !sheet.isOpen()
    sheet.setOpen(pinned)
  })
  /**
   * Closes on Escape, which was for closing it and not for whatever is underneath too
   * @param {KeyboardEvent} event - A key going down
   * @returns {void}
   */
  function escape(event) {
    if (event.key === 'Escape' && sheet.isOpen()) {
      event.preventDefault()
      event.stopPropagation()
      sheet.close()
    }
  }
  globalThis.addEventListener('keydown', escape, true)
  const unclose = sheet.onClose(() => {
    pinned = false
  })
  return () => {
    unhold()
    untap()
    globalThis.removeEventListener('keydown', escape, true)
    unclose()
  }
}

export { holdToOpen }
