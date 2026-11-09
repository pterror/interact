/**
 * Typed characters as keys in bindings: "?", "!", "/", "+" (written "plus" with aliases()). A binding to one fires
 * however it is typed: "?" takes Shift on most layouts, and still fires. A key syntax piece, for keyParse() and
 * keyQuery().
 */

import { modifierPrefix } from './modifiers.js'
import { punctuation } from './punctuation.js'

/**
 * @typedef {Readonly<{ ctrl: boolean, alt: boolean, shift: boolean, meta: boolean }>} Modifiers
 */

/**
 * @typedef {Readonly<{
 *   accepts: (key: string) => boolean,
 *   shifted: (key: string) => string | undefined,
 *   lookups: (key: string, mods: Modifiers) => readonly string[],
 * }>} Symbols
 */

/**
 * Whether a key is one printable character that isn't a letter or digit ("?", "!", "+"; "é" is a letter)
 * @param {string} key - A key name, as an event reports it
 * @returns {boolean} Whether it is
 */
function isSymbol(key) {
  return /^.$/su.test(key) && key.trim() !== '' && key.toLowerCase() === key.toUpperCase() && !/\d/u.test(key)
}

/**
 * Typed characters, as a piece of key syntax
 * @returns {Symbols} The piece: any such character is a key; with Shift, a punctuation key means the physical key
 *   ("shift+/" is "shift+slash"); and a typed character is also looked up without the Shift it took
 */
function symbols() {
  return {
    accepts: isSymbol,
    lookups: (key, mods) => (isSymbol(key) && mods.shift ? [`${modifierPrefix({ ...mods, shift: false })}${key}`] : []),
    shifted: (key) => punctuation.get(key),
  }
}

export { symbols }
