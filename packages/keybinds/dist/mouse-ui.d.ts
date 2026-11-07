/**
 * Showing and recording mouse bindings, for the settings panel, cheatsheet, palette and menus. Recording takes what's
 * done next: a click or a scroll, or with `release` a button's press and its release. Scrolling has no release.
 */
import type { InputUI } from './input.js';
import type { WheelOptions } from './mouse.js';
/**
 * A mouse binding as display parts ("$mod+click" is ["⌘", "Click"] on a Mac)
 * @param {string} binding - The binding
 * @returns {string[]} The parts as shown
 */
declare function formatMouseParts(binding: string): string[];
/**
 * A mouse or wheel event as a binding ("$mod+click", "$mod+scrollup", "middle:up" for a mouseup)
 * @param {MouseEvent} event - The event
 * @returns {string | undefined} The binding, or undefined for a button no binding names, or a wheel event that
 *   doesn't scroll
 */
declare function eventToMouseBindingString(event: MouseEvent): string | undefined;
/**
 * The mouse, shown and recorded as well as listened to
 * @param {Readonly<{ wheel?: WheelOptions }>} [options] - As for mouse()
 * @returns {InputUI} The mouse, as an input that can be shown and recorded
 */
declare function mouseUI(options?: Readonly<{
    wheel?: WheelOptions;
}>): InputUI;
export { eventToMouseBindingString, formatMouseParts, mouseUI };
