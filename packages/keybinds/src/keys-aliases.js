/**
 * Short names for keys in bindings: "up", "down", "left", "right" for the arrow keys, and "plus" for "+" (which
 * separates a binding's parts, so it can't be written as itself; needs symbols()).
 */

/** @import { KeySyntax } from './keys.js' */

/** @type {ReadonlyMap<string, string>} */
const KEY_ALIASES = new Map([
  ['down', 'arrowdown'],
  ['left', 'arrowleft'],
  ['plus', '+'],
  ['right', 'arrowright'],
  ['up', 'arrowup'],
])

/**
 * For keys(aliases())
 * @returns {KeySyntax} The aliases, as a piece of key syntax
 */
function aliases() {
  return { alias: (name) => KEY_ALIASES.get(name), name: 'aliases' }
}

export { KEY_ALIASES, aliases }
