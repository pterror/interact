/**
 * Mouse input: buttons ("$mod+Click", "MiddleClick", "Back:up") and scrolling ("ScrollUp"). Showing and recording
 * them is keybinds/mouse-ui. Listened to for one keybinds(), buttons go down and up, held buttons are released when
 * the page never sees them let go, side buttons are kept from navigating while bound, and scrolling runs in steps: a
 * command runs once per step of scrolling (a wheel notch, or a trackpad's small deltas adding up to one), the page
 * holds still between steps, and a pause starts a new gesture.
 */
import type { Modifiers } from './binding-mods.js';
import type { Command } from './command.js';
import type { CommandInput } from './input.js';
export type WheelOptions = Readonly<{
    idle?: number;
    step?: number;
}>;
export type Gesture = {
    amount: number;
    last: number;
    ours: boolean;
};
export type ParsedMouse = Readonly<{
    button: string;
    mods: Modifiers;
}>;
/**
 * A pointer button's name as bindings write it, by `MouseEvent.button`
 * @param {number} button - The button
 * @returns {string | undefined} Its name, or undefined for a button no binding names
 */
declare function pointerButtonName(button: number): string | undefined;
/**
 * Which way a wheel event scrolls, as a binding names it: vertically if it does, otherwise horizontally
 * @param {WheelEvent} event - The event
 * @returns {string | undefined} "scrollup", "scrolldown", "scrollleft" or "scrollright"; undefined if it doesn't
 */
declare function wheelDirection(event: WheelEvent): string | undefined;
/**
 * Parses a mouse binding like "$mod+Click" or "MiddleClick", without its suffix
 * @param {string} binding - The binding
 * @param {string} [suffix] - Its suffix (":up", ":hold"), if any; scrolling takes none
 * @returns {ParsedMouse} Its modifiers and button
 * @throws {Error} If the binding is invalid
 */
declare function parseMouse(binding: string, suffix?: string): ParsedMouse;
/**
 * Whether a mouse press is one of a command's press bindings (same button, same modifiers), for code that handles
 * the press itself, like a drag that should start on a rebindable button
 * @param {Command} command - The command
 * @param {MouseEvent} event - The press
 * @returns {boolean} Whether it is
 */
declare function mouseMatches(command: Command, event: MouseEvent): boolean;
/**
 * The mouse
 * @param {Readonly<{ wheel?: WheelOptions }>} [options] - Scroll bindings: a command runs once per `step` pixels
 *   scrolled (default 50, about one mouse-wheel notch; a trackpad's small deltas add up to it), and a pause of `idle`
 *   ms (default 200) starts a new gesture
 * @returns {CommandInput} The mouse, as an input
 */
declare function mouse(options?: Readonly<{
    wheel?: WheelOptions;
}>): CommandInput;
export { mouse, mouseMatches, parseMouse, pointerButtonName, wheelDirection };
