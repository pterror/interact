/**
 * Mouse input: buttons ("$mod+Click", "MiddleClick", "Back:up") and scrolling ("ScrollUp"). Showing and recording
 * them is keybinds/mouse-ui.
 */
import type { Modifiers } from './binding-mods.js';
import type { Command } from './command.js';
import type { CommandInput } from './input.js';
import type { WheelOptions } from './mouse-listener.js';
export type ParsedMouse = Readonly<{
    button: string;
    mods: Modifiers;
}>;
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
export { mouse, mouseMatches, parseMouse };
