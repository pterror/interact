/**
 * The keyboard, listened to for one keybinds(): keys going down and up, and every held key released when the window
 * loses focus.
 */
import type { KeySyntax } from './keys.js';
import type { Dispatch } from './input.js';
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
/** The keyboard, listened to for one keybinds() */
declare class KeyListener {
    #private;
    /**
     * Starts listening
     * @param {Dispatch} dispatch - Where presses are reported
     * @param {readonly KeySyntax[]} syntax - The syntax on
     */
    constructor(dispatch: Dispatch, syntax: readonly KeySyntax[]);
    /**
     * Hears the keyboard and the window's focus
     * @param {Event} event - A keydown, keyup or blur
     * @returns {void}
     */
    handleEvent(event: Event): void;
    /** @returns {void} */
    stop(): void;
}
export { KeyListener, eventToKeyLookups, keyId };
