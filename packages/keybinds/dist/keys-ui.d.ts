/**
 * Showing and recording keyboard bindings, for the settings panel, cheatsheet, palette and menus. Recording takes what's
 * pressed next: a press, or with `release` the press and its release.
 */
import type { InputUI } from './input.js';
import type { KeySyntax } from './keys.js';
/**
 * A key binding as display parts ("$mod+k" is ["⌘", "K"] on a Mac)
 * @param {string} binding - The binding
 * @param {readonly KeySyntax[]} [syntax] - As for keys(); a layout() among them shows physical keys as it types them
 * @returns {string[]} The parts as shown
 */
declare function formatKeyParts(binding: string, syntax?: readonly KeySyntax[]): string[];
/**
 * A key event as a binding ("$mod+shift+k"), in the syntax the keyboard input reads: a typed character like "?" only
 * with symbols(), "plus" only with aliases() too; otherwise the physical key ("shift+slash")
 * @param {KeyboardEvent} event - The event
 * @param {readonly KeySyntax[]} [syntax] - The syntax on
 * @returns {string | undefined} The binding, or undefined for a modifier pressed alone or a key that can't be bound
 */
declare function eventToBindingString(event: KeyboardEvent, syntax?: readonly KeySyntax[]): string | undefined;
/**
 * The keyboard, shown and recorded as well as listened to
 * @param {readonly KeySyntax[]} syntax - As for keys()
 * @returns {InputUI} The keyboard, as an input that can be shown and recorded
 */
declare function keysUI(...syntax: readonly KeySyntax[]): InputUI;
export { eventToBindingString, formatKeyParts, keysUI };
