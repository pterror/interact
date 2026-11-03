/**
 * Keyboard input: bindings like "$mod+k", "shift+slash" or "Escape". More syntax is opt-in, each its own module
 * passed to keys(): symbols() for "?" and other typed characters, aliases() for "up" and "plus". Showing and
 * recording bindings is keybinds/keys-ui.
 */
import type { Modifiers } from './binding-mods.js';
import type { CommandInput } from './input.js';
export type ParsedKey = Readonly<{
    key: string;
    mods: Modifiers;
}>;
export type KeySyntaxFields = {
    /**
     * - Which piece it is ("symbols", "aliases", "layout")
     */
    name: string;
    /**
     * - The key a name stands for
     */
    alias?: (name: string) => string | undefined;
    /**
     * - Keys it makes bindable
     */
    accepts?: (key: string) => boolean;
    /**
     * - What a binding with Shift means instead
     */
    shifted?: (key: string) => string | undefined;
    /**
     * - More lookups for a key event
     */
    lookups?: (key: string, prefix: string, suffix: string) => string[];
    /**
     * - How a key is shown, for display pieces like layout()
     */
    glyph?: (name: string) => string | undefined;
    /**
     * - Follows how keys are shown changing
     */
    watch?: (onChange: () => void) => () => void;
};
export type KeySyntax = Readonly<KeySyntaxFields>;
/** Named keys, by the name a key event reports (`event.key`, or `event.code` for physical keys) */
declare const NAMED_KEY: RegExp;
/**
 * Whether a key is a letter (in any script) or a digit: what a key types on its own, bindable as itself
 * @param {string} key - A key name
 * @returns {boolean} Whether it is
 */
declare function isLetterOrDigit(key: string): boolean;
/**
 * Parses a key binding like "Ctrl+Shift+K" into normalized form. Its release suffix, if any, has already been taken
 * off.
 * @param {string} binding - The binding
 * @param {readonly KeySyntax[]} [syntax] - The syntax on
 * @returns {ParsedKey} Its modifiers and key
 * @throws {Error} If the binding is invalid
 */
declare function parseKey(binding: string, syntax?: readonly KeySyntax[]): ParsedKey;
/**
 * A parsed key as a lookup ("ctrl+shift+k")
 * @param {ParsedKey} parsed - The key
 * @returns {string} Its lookup
 */
declare function keyToLookup(parsed: ParsedKey): string;
/**
 * The keyboard
 * @param {readonly KeySyntax[]} syntax - More binding syntax: symbols(), aliases()
 * @returns {CommandInput & Readonly<{ syntax: readonly KeySyntax[] }>} The keyboard, as an input
 */
declare function keys(...syntax: readonly KeySyntax[]): CommandInput & Readonly<{
    syntax: readonly KeySyntax[];
}>;
export { NAMED_KEY, isLetterOrDigit, keyToLookup, keys, parseKey };
