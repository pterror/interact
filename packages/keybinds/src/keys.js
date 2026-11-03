/**
 * Keyboard input: bindings like "$mod+k", "shift+slash" or "Escape". More syntax is opt-in, each its own module
 * passed to keys(): symbols() for "?" and other typed characters, aliases() for "up" and "plus". Showing and
 * recording bindings is keybinds/keys-ui.
 */

/**
 * @import { ParsedBinding } from './binding.js'
 * @import { Modifiers } from './binding-mods.js'
 * @import { CommandInput, Dispatch, InputHandle } from './input.js'
 */

import { NO_MODS, modsToPrefix, parseMods } from './binding-mods.js'
import { KeyListener } from './keys-listener.js'

/**
 * A key binding parsed: its modifiers and its key
 * @typedef {Readonly<{ key: string, mods: Modifiers }>} ParsedKey
 */

/**
 * @typedef {object} KeySyntaxFields
 * @property {string} name - Which piece it is ("symbols", "aliases", "layout")
 * @property {(name: string) => string | undefined} [alias] - The key a name stands for
 * @property {(key: string) => boolean} [accepts] - Keys it makes bindable
 * @property {(key: string) => string | undefined} [shifted] - What a binding with Shift means instead
 * @property {(key: string, prefix: string, suffix: string) => string[]} [lookups] - More lookups for a key event
 * @property {(name: string) => string | undefined} [glyph] - How a key is shown, for display pieces like layout()
 * @property {(onChange: () => void) => () => void} [watch] - Follows how keys are shown changing
 */

/**
 * A piece of key binding syntax beyond modifiers and key names
 * @typedef {Readonly<KeySyntaxFields>} KeySyntax
 */

const NONE = 0

/** Named keys, by the name a key event reports (`event.key`, or `event.code` for physical keys) */
const NAMED_KEY =
  /^(?:f(?:[1-9]|1[0-2])|escape|enter|tab|space|backspace|delete|insert|home|end|page(?:up|down)|arrow(?:up|down|left|right)|bracket(?:left|right)|backslash|semicolon|quote|comma|period|slash|backquote|minus|equal|digit\d)$/u

/**
 * Whether a key is a letter (in any script) or a digit: what a key types on its own, bindable as itself
 * @param {string} key - A key name
 * @returns {boolean} Whether it is
 */
function isLetterOrDigit(key) {
  return /^.$/su.test(key) && (key.toLowerCase() !== key.toUpperCase() || /\d/u.test(key))
}

/**
 * The key a name stands for, through each piece of syntax's aliases
 * @param {string} name - The name as written
 * @param {readonly KeySyntax[]} syntax - The syntax on
 * @returns {string} The key
 */
function aliased(name, syntax) {
  let key = name
  for (const each of syntax) {
    key = each.alias?.(key) ?? key
  }
  return key
}

/**
 * What a key in a binding with Shift means instead, through each piece of syntax
 * @param {string} key - The key
 * @param {readonly KeySyntax[]} syntax - The syntax on
 * @returns {string} The physical key it means
 */
function shifted(key, syntax) {
  let physical = key
  for (const each of syntax) {
    physical = each.shifted?.(physical) ?? physical
  }
  return physical
}

/**
 * A key binding's one key, after aliases, checked to be one that can be bound
 * @param {string} binding - The binding, for errors
 * @param {readonly string[]} remaining - Its parts that aren't modifiers
 * @param {readonly KeySyntax[]} syntax - The syntax on
 * @returns {string} The key
 * @throws {Error} If there is no key, more than one, or one that can't be bound
 */
function onlyKey(binding, remaining, syntax) {
  const [raw, ...more] = remaining
  if (raw === undefined) {
    throw new Error(`Key binding has no key (only modifiers): "${binding}"`)
  }
  if (more.length > NONE) {
    throw new Error(`Key binding has multiple keys: "${binding}" (got: ${remaining.join(', ')})`)
  }
  const key = aliased(raw, syntax)
  if (!isLetterOrDigit(key) && !NAMED_KEY.test(key) && !syntax.some((each) => each.accepts?.(key) === true)) {
    throw new Error(`Unknown key "${raw}" in binding "${binding}"`)
  }
  return key
}

/**
 * Parses a key binding like "Ctrl+Shift+K" into normalized form. Its release suffix, if any, has already been taken
 * off.
 * @param {string} binding - The binding
 * @param {readonly KeySyntax[]} [syntax] - The syntax on
 * @returns {ParsedKey} Its modifiers and key
 * @throws {Error} If the binding is invalid
 */
function parseKey(binding, syntax = []) {
  if (binding === '') {
    throw new Error('Invalid key binding: an empty string')
  }
  const parts = binding
    .toLowerCase()
    .split('+')
    .map((part) => part.trim())
    .filter((part) => part !== '')
  const { mods, remaining } = parseMods(parts)
  const key = onlyKey(binding, remaining, syntax)
  if (!mods.shift) {
    return { key, mods }
  }
  // With Shift held a digit types a different character, so the binding means the physical key
  return { key: shifted(/^\d$/u.test(key) ? `digit${key}` : key, syntax), mods }
}

/**
 * A parsed key as a lookup ("ctrl+shift+k")
 * @param {ParsedKey} parsed - The key
 * @returns {string} Its lookup
 */
function keyToLookup(parsed) {
  return `${modsToPrefix(parsed.mods)}${parsed.key}`
}

/**
 * The keyboard
 * @param {readonly KeySyntax[]} syntax - More binding syntax: symbols(), aliases()
 * @returns {CommandInput & Readonly<{ syntax: readonly KeySyntax[] }>} The keyboard, as an input
 */
function keys(...syntax) {
  return {
    field: 'keys',
    /**
     * Starts listening
     * @param {Dispatch} dispatch - Where presses are reported
     * @returns {InputHandle} A function that stops
     */
    listen(dispatch) {
      const listener = new KeyListener(dispatch, syntax)
      return () => {
        listener.stop()
      }
    },
    /**
     * Parses one step of a binding
     * @param {string} step - The step
     * @returns {ParsedBinding} The step normalized
     */
    parse(step) {
      const parsed = parseKey(step, syntax)
      return { lookup: keyToLookup(parsed), loose: keyToLookup({ ...parsed, mods: NO_MODS }), mods: parsed.mods }
    },
    syntax,
  }
}

export { NAMED_KEY, isLetterOrDigit, keyToLookup, keys, parseKey }
