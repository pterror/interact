/**
 * Key bindings as strings, and key events as the lookups bindings are found by. A binding is modifiers and one key:
 * "$mod+k", "shift+slash", "Escape". More syntax is opt-in, each piece its own module: symbols() ("?"), aliases()
 * ("up", "plus"), printed() (any key typing a character). Syntax whose piece isn't given is an error naming it.
 */

import { keyAliases } from './aliases.js'
import { eventModifiers, modifierPrefix, noModifiers, parseModifiers } from './modifiers.js'

/**
 * @typedef {Readonly<{ ctrl: boolean, alt: boolean, shift: boolean, meta: boolean }>} Modifiers
 */

/**
 * A piece of key syntax: the key a name stands for; keys it makes bindable, with the modifiers bound; what a key
 * with Shift means instead; lookups it adds to a key event's, for the modifiers those carry and those held; and
 * lookups after every other
 * @typedef {Readonly<{
 *   alias?: (name: string) => string | undefined,
 *   accepts?: (key: string, mods: Modifiers) => boolean,
 *   shifted?: (key: string) => string | undefined,
 *   lookups?: (key: string, mods: Modifiers, held: Modifiers) => readonly string[],
 *   fallback?: (key: string, held: Modifiers) => readonly string[],
 * }>} KeySyntax
 */

/**
 * A key binding parsed: its lookup, its lookup without modifiers, and the modifiers it needs
 * @typedef {Readonly<{ lookup: string, bare: string, mods: Modifiers }>} ParsedKey
 */

/**
 * A key event's lookups, best first; the same without modifiers; and the modifiers held
 * @typedef {Readonly<{ exact: readonly string[], bare: readonly string[], mods: Modifiers }>} Query
 */

/**
 * What a key event says of its key
 * @typedef {Readonly<{ key: string, code: string, ctrlKey: boolean, altKey: boolean, shiftKey: boolean,
 *   metaKey: boolean }>} KeyEvent
 */

/** Named keys, by the name a key event reports (`event.key`, or `event.code` for physical keys) */
const NAMED_KEY =
  /^(?:f(?:[1-9]|1[0-2])|escape|enter|tab|space|backspace|delete|insert|home|end|page(?:up|down)|arrow(?:up|down|left|right)|bracket(?:left|right)|backslash|semicolon|quote|comma|period|slash|backquote|minus|equal|digit\d)$/u

/**
 * Whether a key is a letter (in any script) or a digit: bindable as itself
 * @param {string} key - A key name
 * @returns {boolean} Whether it is
 */
function isLetterOrDigit(key) {
  return /^.$/su.test(key) && (key.toLowerCase() !== key.toUpperCase() || /\d/u.test(key))
}

/**
 * The piece of syntax a key needs, for an error that names it
 * @param {string} raw - The key as written
 * @param {string} key - The key after aliases
 * @returns {string} What to add, or nothing known
 */
function needs(raw, key) {
  if (key === 'printed') {
    return ' (needs printed())'
  }
  if (/^.$/su.test(key)) {
    return ' (needs symbols())'
  }
  return keyAliases.has(raw) ? ' (needs aliases())' : ''
}

/**
 * Parses one key binding, without a suffix or other steps
 * @param {string} binding - The binding: "ctrl+shift+k"
 * @param {readonly KeySyntax[]} [syntax] - The pieces of syntax on
 * @returns {ParsedKey} It normalized
 * @throws {Error} If it is empty, has no key or several, or a key that can't be bound with the syntax on
 */
function keyParse(binding, syntax = []) {
  if (binding.trim() === '') {
    throw new Error('Invalid key binding: an empty string')
  }
  const parts = binding
    .toLowerCase()
    .split('+')
    .map((part) => part.trim())
    .filter((part) => part !== '')
  const { mods, rest } = parseModifiers(parts)
  const raw = rest.at(0)
  if (raw === undefined) {
    throw new Error(`Key binding has no key (only modifiers): "${binding}"`)
  }
  if (rest.length > 1) {
    throw new Error(`Key binding has multiple keys: "${binding}" (got: ${rest.join(', ')})`)
  }
  let named = raw
  for (const piece of syntax) {
    named = piece.alias?.(named) ?? named
  }
  if (
    !isLetterOrDigit(named) &&
    !NAMED_KEY.test(named) &&
    !syntax.some((piece) => piece.accepts?.(named, mods) === true)
  ) {
    if (syntax.some((piece) => piece.accepts?.(named, noModifiers) === true)) {
      throw new Error(`Key "${raw}" can't be bound with modifiers: "${binding}"`)
    }
    throw new Error(`Unknown key "${raw}" in binding "${binding}"${needs(raw, named)}`)
  }
  // With Shift held a digit or punctuation key types a different character, so the binding means the physical key
  let key = mods.shift && /^\d$/u.test(named) ? `digit${named}` : named
  for (const piece of mods.shift ? syntax : []) {
    key = piece.shifted?.(key) ?? key
  }
  return { bare: key, lookup: `${modifierPrefix(mods)}${key}`, mods }
}

/**
 * A key event's lookups for some modifiers: by the key it typed, its physical key, and its letter, then the syntax's
 * @param {KeyEvent} event - The event
 * @param {Modifiers} mods - The modifiers the lookups carry
 * @param {Modifiers} held - The modifiers held
 * @param {readonly KeySyntax[]} syntax - The pieces of syntax on
 * @returns {readonly string[]} The lookups, best first
 */
function lookupsOf(event, mods, held, syntax) {
  const prefix = modifierPrefix(mods)
  const key = event.key.toLowerCase()
  const code = event.code.toLowerCase()
  const letter = code.startsWith('key') ? code.slice('key'.length) : undefined
  return [
    `${prefix}${key}`,
    ...(code === key || code === '' ? [] : [`${prefix}${code}`]),
    ...(letter === undefined || letter === key ? [] : [`${prefix}${letter}`]),
    ...syntax.flatMap((piece) => piece.lookups?.(event.key, mods, held) ?? []),
    ...syntax.flatMap((piece) => piece.fallback?.(event.key, held) ?? []),
  ]
}

/**
 * What a key event is looked up by
 * @param {KeyEvent} event - The event
 * @param {readonly KeySyntax[]} [syntax] - The pieces of syntax on
 * @returns {Query} Its lookups, best first; the same without modifiers; and the modifiers held
 */
function keyQuery(event, syntax = []) {
  const held = eventModifiers(event)
  return {
    bare: lookupsOf(event, noModifiers, held, syntax),
    exact: lookupsOf(event, held, held, syntax),
    mods: held,
  }
}

export { keyParse, keyQuery }
