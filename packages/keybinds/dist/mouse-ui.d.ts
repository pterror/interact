/**
 * Showing and recording mouse bindings, for the settings panel, cheatsheet, palette and menus.
 */
import type { InputUI } from './input.js';
import type { WheelOptions } from './mouse-listener.js';
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
