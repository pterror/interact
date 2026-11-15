/**
 * A key binding as people see it, one part per modifier and the key: "$mod+k" is ["⌘", "K"] on a Mac. A physical key
 * named in a binding ("slash", "digit1") shows as the character it types on the person's layout, given its glyph map,
 * or on a US layout without one. One step, without a suffix: formatSteps() shows the rest.
 */

import { formatModifier } from './modifiers.js'
import { punctuation } from './punctuation.js'
import { withStrings } from './strings.js'

/** @import { Strings, StringsOption } from './strings.js' */

/**
 * The keys that show as a symbol or a name
 * @param {Strings} strings - The names
 * @returns {ReadonlyMap<string, string>} By the key as a binding writes it, lowercase
 */
const named = (strings) =>
  new Map([
    ['arrowdown', '↓'],
    ['arrowleft', '←'],
    ['arrowright', '→'],
    ['arrowup', '↑'],
    ['backspace', '⌫'],
    ['delete', '⌦'],
    ['down', '↓'],
    ['enter', '↵'],
    ['esc', strings.escape],
    ['escape', strings.escape],
    ['left', '←'],
    ['plus', '+'],
    ['right', '→'],
    ['space', strings.space],
    ['tab', strings.tab],
    ['up', '↑'],
  ])

/** @type {ReadonlyMap<string, string>} */
const US = new Map(Array.from(punctuation.keys(), (typed) => [punctuation.get(typed) ?? typed, typed]))

/**
 * What a physical key types on a layout
 * @param {string} name - The key, lowercase: "slash", "digit1"
 * @param {ReadonlyMap<string, string>} layout - What each physical key types, by `event.code`
 * @returns {string | undefined} The character, uppercase, if the layout says
 */
function typedOn(name, layout) {
  if (!US.has(name) && !/^digit\d$/u.test(name)) {
    return undefined
  }
  for (const [code, typed] of layout) {
    if (code.toLowerCase() === name && typed !== '') {
      return typed.toUpperCase()
    }
  }
  return undefined
}

/**
 * One part of a key binding as shown
 * @param {string} part - The part
 * @param {ReadonlyMap<string, string> | undefined} layout - The person's layout, if known
 * @param {Strings} strings - The names
 * @returns {string} Its symbol or name
 */
function formatPart(part, layout, strings) {
  const name = part.trim().toLowerCase()
  return (
    formatModifier(name, strings) ??
    (layout === undefined ? undefined : typedOn(name, layout)) ??
    named(strings).get(name) ??
    US.get(name) ??
    (/^digit\d$/u.test(name) ? name.slice('digit'.length) : part.trim().toUpperCase())
  )
}

/**
 * A key binding as display parts
 * @param {string} binding - One step of a binding, without a suffix: "ctrl+shift+slash"
 * @param {ReadonlyMap<string, string>} [layout] - What each physical key types on the person's layout, by
 *   `event.code` (layout()'s value)
 * @param {StringsOption} [strings] - The words to show in place of English
 * @returns {string[]} The parts as shown
 */
function formatKey(binding, layout, strings) {
  const words = withStrings(strings)
  return binding.split('+').map((part) => formatPart(part, layout, words))
}

export { formatKey }
