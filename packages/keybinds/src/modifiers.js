/**
 * Modifier keys, as bindings write them and as events report them: Ctrl, Alt, Shift and Meta, and `$mod` for the
 * platform's own (Meta on a Mac, Ctrl elsewhere).
 */

/**
 * Which modifiers are held, or which a binding needs
 * @typedef {Readonly<{ ctrl: boolean, alt: boolean, shift: boolean, meta: boolean }>} Modifiers
 */

/** @typedef {keyof Modifiers} Modifier */

/**
 * What an event reports of the modifiers held
 * @typedef {Readonly<{ ctrlKey: boolean, altKey: boolean, shiftKey: boolean, metaKey: boolean }>} ModifierState
 */

/** Whether this is a Mac, where `$mod` is Meta (⌘) rather than Ctrl */
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/u.test(navigator.platform)

/** @type {readonly Modifier[]} */
const ORDER = ['ctrl', 'alt', 'shift', 'meta']

/** @type {ReadonlyMap<string, Modifier>} */
const NAMES = new Map([
  ['$mod', isMac ? 'meta' : 'ctrl'],
  ['alt', 'alt'],
  ['cmd', 'meta'],
  ['command', 'meta'],
  ['control', 'ctrl'],
  ['ctrl', 'ctrl'],
  ['meta', 'meta'],
  ['option', 'alt'],
  ['shift', 'shift'],
])

/** @type {ReadonlyMap<string, string>} */
const SHOWN = new Map([
  ['$mod', isMac ? '⌘' : 'Ctrl'],
  ['alt', isMac ? '⌥' : 'Alt'],
  ['cmd', '⌘'],
  ['command', '⌘'],
  ['control', isMac ? '⌃' : 'Ctrl'],
  ['ctrl', isMac ? '⌃' : 'Ctrl'],
  ['meta', '⌘'],
  ['option', isMac ? '⌥' : 'Alt'],
  ['shift', isMac ? '⇧' : 'Shift'],
])

/** @type {Modifiers} */
const noModifiers = { alt: false, ctrl: false, meta: false, shift: false }

/**
 * The modifiers among a binding's parts, and the parts that aren't modifiers
 * @param {readonly string[]} parts - A binding split at "+", lowercase
 * @returns {Readonly<{ mods: Modifiers, rest: readonly string[] }>} The modifiers it needs, and the rest in order
 */
function parseModifiers(parts) {
  const named = new Set(parts.map((part) => NAMES.get(part)))
  return {
    mods: { alt: named.has('alt'), ctrl: named.has('ctrl'), meta: named.has('meta'), shift: named.has('shift') },
    rest: parts.filter((part) => !NAMES.has(part)),
  }
}

/**
 * The modifiers held during an event
 * @param {ModifierState} event - A key or mouse event
 * @returns {Modifiers} What was held
 */
function eventModifiers(event) {
  return { alt: event.altKey, ctrl: event.ctrlKey, meta: event.metaKey, shift: event.shiftKey }
}

/**
 * Modifiers as the start of a lookup ("ctrl+alt+"), in one order whatever order they were written in
 * @param {Modifiers} mods - The modifiers
 * @returns {string} Each held one followed by "+"
 */
function modifierPrefix(mods) {
  return ORDER.filter((name) => mods[name])
    .map((name) => `${name}+`)
    .join('')
}

/**
 * The modifiers held during an event as a binding writes them, `$mod` for the platform's own, for recording one
 * @param {ModifierState} event - A key or mouse event
 * @param {boolean} [shift] - Whether to include Shift (default: whether it was held)
 * @returns {readonly string[]} The modifier parts, in binding order
 */
function eventModifierParts(event, shift = event.shiftKey) {
  const own = isMac ? event.metaKey : event.ctrlKey
  const other = isMac ? event.ctrlKey : event.metaKey
  return [
    ...(own ? ['$mod'] : []),
    ...(other ? [isMac ? 'ctrl' : 'meta'] : []),
    ...(event.altKey ? ['alt'] : []),
    ...(shift ? ['shift'] : []),
  ]
}

/**
 * How a modifier in a binding is shown on this platform
 * @param {string} part - One part of a binding, lowercase
 * @returns {string | undefined} Its symbol or name, or nothing if it isn't a modifier
 */
function formatModifier(part) {
  return SHOWN.get(part)
}

export { eventModifierParts, eventModifiers, formatModifier, isMac, modifierPrefix, noModifiers, parseModifiers }
