/**
 * Typeahead, as the WAI-ARIA listbox and menu patterns have it (https://www.w3.org/WAI/ARIA/apg/patterns/listbox/):
 * characters typed in quick succession make a prefix, kept until a pause of `TYPEAHEAD_MS` (the widget asks to `wake`
 * then), and the host finds the item whose text starts with it. A first character, or the same character typed again,
 * finds the next item starting with it after the active one, so repeating a letter cycles through those items; a
 * longer prefix finds from the active item itself, so it stays while it still matches.
 */
import type { KeyDown } from './contract.js';
/** @import { KeyDown } from './contract.js' */
/** How long a prefix is kept after a character is typed, ms **(P)** */
declare const TYPEAHEAD_MS = 500;
export type Typed = Readonly<{
    prefix: string;
    until: number;
    find: string;
    next: boolean;
}>;
/**
 * What a character typed asks to find
 * @typedef {Readonly<{ prefix: string, until: number, find: string, next: boolean }>} Typed
 */
/**
 * Whether a key is a character typed, not a named key (one code point; a named key is a word), with no modifier
 * that makes it a shortcut
 * @param {KeyDown} input - The key
 * @returns {boolean} Whether it is a character
 */
declare function isTyped(input: KeyDown): boolean;
/**
 * Whether a prefix is being typed at a time
 * @param {number} until - When the prefix ends
 * @param {number} timeStamp - The time
 * @returns {boolean} Whether it is
 */
declare function typing(until: number, timeStamp: number): boolean;
/**
 * A character typed: the prefix after it, when it ends, and what to find
 * @param {string} prefix - The prefix so far
 * @param {number} until - When it ends
 * @param {KeyDown} input - The character
 * @returns {Typed} The prefix, and what to find
 */
declare function typed(prefix: string, until: number, input: KeyDown): Typed;
export { isTyped, TYPEAHEAD_MS, typed, typing };
