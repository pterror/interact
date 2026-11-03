/**
 * Modifier keys, as bindings write them and as events report them: Ctrl, Alt, Shift and Meta, and `$mod` for the
 * platform's own (Meta on a Mac, Ctrl elsewhere).
 */

/**
 * Which modifiers are held, or which a binding needs
 * @typedef {Readonly<{ alt: boolean, ctrl: boolean, meta: boolean, shift: boolean }>} Modifiers
 */

/** @typedef {keyof Modifiers} Modifier */

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
const NO_MODS = { alt: false, ctrl: false, meta: false, shift: false }

/**
 * The modifiers in a binding's parts, and the parts that aren't modifiers
 * @param {readonly string[]} parts - A binding split at "+", lowercase
 * @returns {Readonly<{ mods: Modifiers, remaining: string[] }>} The modifiers it needs, and the rest in order
 */
function parseMods(parts) {
  const named = new Set(parts.map((part) => NAMES.get(part)))
  return {
    mods: { alt: named.has('alt'), ctrl: named.has('ctrl'), meta: named.has('meta'), shift: named.has('shift') },
    remaining: parts.filter((part) => !NAMES.has(part)),
  }
}

/**
 * How a modifier in a binding is shown
 * @param {string} part - One part of a binding, lowercase
 * @returns {string | undefined} Its symbol or name, or undefined if it isn't a modifier
 */
function formatModPart(part) {
  return SHOWN.get(part)
}

/**
 * The modifiers held during an event, as a binding writes them: `$mod` for the platform's own
 * @param {KeyboardEvent | MouseEvent} event - A key or mouse event
 * @param {boolean} [shift] - Whether to include Shift (default: whether it was held)
 * @returns {string[]} The modifier parts, in binding order
 */
function eventModParts(event, shift = event.shiftKey) {
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
 * Modifiers as the canonical start of a lookup ("ctrl+alt+")
 * @param {Modifiers} mods - The modifiers
 * @returns {string} Each held one followed by "+", in a fixed order
 */
function modsToPrefix(mods) {
  return ORDER.filter((name) => mods[name])
    .map((name) => `${name}+`)
    .join('')
}

/**
 * The modifiers held during an event
 * @param {KeyboardEvent | MouseEvent} event - A key or mouse event
 * @returns {Modifiers} What was held
 */
function eventMods(event) {
  return { alt: event.altKey, ctrl: event.ctrlKey, meta: event.metaKey, shift: event.shiftKey }
}

/**
 * Whether every modifier in `required` is among `held`
 * @param {Modifiers} required - What a binding needs
 * @param {Modifiers} held - What is held
 * @returns {boolean} Whether all of it is held
 */
function holdsAll(required, held) {
  return ORDER.every((name) => !required[name] || held[name])
}

export { NO_MODS, eventModParts, eventMods, formatModPart, holdsAll, isMac, modsToPrefix, parseMods }
