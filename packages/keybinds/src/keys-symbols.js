/**
 * Typed characters as key bindings: "?", "!", "/", "+" (written "plus" with aliases()). A binding to one matches
 * however it was typed: "?" takes Shift on most layouts, and still fires.
 */

/** @import { KeySyntax } from './keys.js' */

/**
 * Punctuation keys, and the name of the physical key that types each on a US layout (`event.code`)
 * @type {ReadonlyMap<string, string>}
 */
const PUNCTUATION_CODES = new Map([
  ["'", 'quote'],
  [',', 'comma'],
  ['-', 'minus'],
  ['.', 'period'],
  ['/', 'slash'],
  [';', 'semicolon'],
  ['=', 'equal'],
  ['[', 'bracketleft'],
  ['\\', 'backslash'],
  [']', 'bracketright'],
  ['`', 'backquote'],
])

/**
 * Whether a key is a single printable character that isn't a letter or digit ("?", "!", "+"; "é" is a letter)
 * @param {string} key - A key name, as an event reports it
 * @returns {boolean} Whether it is
 */
function isSymbolKey(key) {
  return /^.$/su.test(key) && key.trim() !== '' && key.toLowerCase() === key.toUpperCase() && !/\d/u.test(key)
}

/**
 * For keys(symbols())
 * @returns {KeySyntax} Typed characters, as a piece of key syntax
 */
function symbols() {
  return {
    accepts: (key) => isSymbolKey(key),
    // "?" is bound as "?", but typing it takes Shift
    lookups: (key, prefix, suffix) =>
      isSymbolKey(key) && prefix.includes('shift+') ? [`${prefix.replace('shift+', '')}${key}${suffix}`] : [],
    name: 'symbols',
    /* With Shift held, a punctuation key types a different character ("shift+/" types "?"), so the binding means the
       physical key: "shift+slash" */
    shifted: (key) => PUNCTUATION_CODES.get(key),
  }
}

export { PUNCTUATION_CODES, isSymbolKey, symbols }
