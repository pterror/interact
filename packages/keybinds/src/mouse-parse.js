/**
 * Mouse bindings as strings: modifiers and one button or scroll direction ("$mod+Click", "MiddleClick", "ScrollUp").
 * Each button has several names; a binding's lookup uses one ("click", "middle", "back", "scrollup"), and so does a
 * mouse event's.
 */

import { modifierPrefix, parseModifiers } from './modifiers.js'

/**
 * @typedef {Readonly<{ ctrl: boolean, alt: boolean, shift: boolean, meta: boolean }>} Modifiers
 */

/**
 * A mouse binding parsed: its lookup, its lookup without modifiers (its button), and the modifiers it needs
 * @typedef {Readonly<{ lookup: string, bare: string, mods: Modifiers }>} ParsedMouse
 */

/**
 * Every name a binding can give a button, to the name lookups use
 * @type {ReadonlyMap<string, string>}
 */
const mouseButtons = new Map([
  ['back', 'back'],
  ['backclick', 'back'],
  ['click', 'click'],
  ['forward', 'forward'],
  ['forwardclick', 'forward'],
  ['left', 'click'],
  ['leftclick', 'click'],
  ['middle', 'middle'],
  ['middleclick', 'middle'],
  ['right', 'right'],
  ['rightclick', 'right'],
  ['scrolldown', 'scrolldown'],
  ['scrollleft', 'scrollleft'],
  ['scrollright', 'scrollright'],
  ['scrollup', 'scrollup'],
])

const VALID = 'Click, RightClick, MiddleClick, BackClick, ForwardClick, ScrollUp, ScrollDown, ScrollLeft, ScrollRight'

/**
 * Parses one mouse binding, without other steps
 * @param {string} binding - The binding, without its suffix: "$mod+Click"
 * @param {string} [suffix] - Its suffix (":up", ":hold"), if any; scrolling takes none
 * @returns {ParsedMouse} It normalized
 * @throws {Error} If it has no button, several, an unknown one, or is a scroll with a suffix
 */
function mouseParse(binding, suffix = '') {
  const parts = binding
    .toLowerCase()
    .split('+')
    .map((part) => part.trim())
    .filter((part) => part !== '')
  const { mods, rest } = parseModifiers(parts)
  const [raw, ...more] = rest
  if (raw === undefined) {
    throw new Error(`Mouse binding has no button (only modifiers): "${binding}"`)
  }
  if (more.length > 0) {
    throw new Error(`Mouse binding has multiple buttons: "${binding}"`)
  }
  const button = mouseButtons.get(raw)
  if (button === undefined) {
    throw new Error(`Unknown mouse button "${raw}" in binding "${binding}". Valid: ${VALID}`)
  }
  if (suffix !== '' && button.startsWith('scroll')) {
    throw new Error(`Scroll has no "${suffix}": "${binding}${suffix}"`)
  }
  return { bare: button, lookup: `${modifierPrefix(mods)}${button}`, mods }
}

/** Buttons by `MouseEvent.button` */
const BY_BUTTON = ['click', 'middle', 'right', 'back', 'forward']

/**
 * The name lookups give a mouse event's button, or a wheel event's direction: vertical if it scrolls so, otherwise
 * horizontal
 * @param {MouseEvent} event - The event
 * @returns {string | undefined} "click", ..., "scrollup", ...; nothing for a button no binding names, or a wheel event
 *   that doesn't scroll
 */
function mouseName(event) {
  if (!(event instanceof WheelEvent)) {
    return BY_BUTTON[event.button]
  }
  if (event.deltaY !== 0) {
    return event.deltaY < 0 ? 'scrollup' : 'scrolldown'
  }
  if (event.deltaX !== 0) {
    return event.deltaX < 0 ? 'scrollleft' : 'scrollright'
  }
  return undefined
}

export { mouseButtons, mouseName, mouseParse }
