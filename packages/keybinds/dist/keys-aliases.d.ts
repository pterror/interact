/**
 * Short names for keys in bindings: "up", "down", "left", "right" for the arrow keys, and "plus" for "+" (which
 * separates a binding's parts, so it can't be written as itself; needs symbols()).
 */
import type { KeySyntax } from './keys.js';
/** @import { KeySyntax } from './keys.js' */
/** @type {ReadonlyMap<string, string>} */
declare const KEY_ALIASES: ReadonlyMap<string, string>;
/**
 * For keys(aliases())
 * @returns {KeySyntax} The aliases, as a piece of key syntax
 */
declare function aliases(): KeySyntax;
export { KEY_ALIASES, aliases };
