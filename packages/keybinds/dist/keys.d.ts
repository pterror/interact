/**
 * Keyboard input: bindings like "$mod+k", "shift+slash" or "Escape". More syntax is opt-in, each its own module
 * passed to keys(): symbols() for "?" and other typed characters, aliases() for "up" and "plus". Showing and
 * recording bindings is keybinds/keys-ui. Listened to for one keybinds(), keys go down and up, and every held key is
 * released when the window loses focus.
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
export type HeldKey = Readonly<{
    code: string;
    key: string;
}>;
export type LookupOptions = Readonly<{
    prefix?: string;
    suffix?: string;
    syntax?: readonly KeySyntax[];
}>;
/**
 * The prefix and suffix an event's lookups get, and the syntax that adds more
 * @typedef {Readonly<{ prefix?: string, suffix?: string, syntax?: readonly KeySyntax[] }>} LookupOptions
 */
/**
 * A key event's lookups: by the key it typed, its physical key, and its letter
 * @param {KeyboardEvent} event - The event
 * @param {LookupOptions} [options] - A modifier prefix to use instead of the event's own, a suffix (":up") and syntax
 * @returns {string[]} Its lookups, best first
 */
declare function eventToKeyLookups(event: KeyboardEvent, options?: LookupOptions): string[];
/**
 * The id a key event's press is known by: its physical key, or its key where there is none
 * @param {KeyboardEvent} event - The event
 * @returns {string} The id
 */
declare function keyId(event: KeyboardEvent): string;
/**
 * The keyboard
 * @param {readonly KeySyntax[]} syntax - More binding syntax: symbols(), aliases()
 * @returns {CommandInput & Readonly<{ syntax: readonly KeySyntax[] }>} The keyboard, as an input
 */
declare function keys(...syntax: readonly KeySyntax[]): CommandInput & Readonly<{
    syntax: readonly KeySyntax[];
}>;
export { NAMED_KEY, eventToKeyLookups, isLetterOrDigit, keyId, keyToLookup, keys, parseKey };
