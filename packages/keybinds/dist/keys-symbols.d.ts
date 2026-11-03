/**
 * Typed characters as key bindings: "?", "!", "/", "+" (written "plus" with aliases()). A binding to one matches
 * however it was typed: "?" takes Shift on most layouts, and still fires.
 */
import type { KeySyntax } from './keys.js';
/** @import { KeySyntax } from './keys.js' */
/**
 * Punctuation keys, and the name of the physical key that types each on a US layout (`event.code`)
 * @type {ReadonlyMap<string, string>}
 */
declare const PUNCTUATION_CODES: ReadonlyMap<string, string>;
/**
 * Whether a key is a single printable character that isn't a letter or digit ("?", "!", "+"; "é" is a letter)
 * @param {string} key - A key name, as an event reports it
 * @returns {boolean} Whether it is
 */
declare function isSymbolKey(key: string): boolean;
/**
 * For keys(symbols())
 * @returns {KeySyntax} Typed characters, as a piece of key syntax
 */
declare function symbols(): KeySyntax;
export { PUNCTUATION_CODES, isSymbolKey, symbols };
