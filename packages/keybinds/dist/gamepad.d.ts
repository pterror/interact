/**
 * Gamepad buttons: bindings like "a", "rt" or "start:up". Gamepad buttons take no modifiers. Showing and recording
 * them is keybinds/gamepad-ui. Listened to for one keybinds(), pads are read every frame while a command has a gamepad
 * binding and a pad is connected: a button changing reports a press starting or ending.
 */
import type { CommandInput } from './input.js';
/**
 * A gamepad binding's button, by its standard name ("a", "rt"), its alias resolved
 * @param {string} binding - The binding, without its suffix
 * @returns {string} The button's standard name
 * @throws {Error} If no button has that name
 */
declare function parseGamepad(binding: string): string;
/**
 * Gamepad buttons. Gamepads have no events for their buttons, so they're read every frame, but only while a command
 * has a gamepad binding and a pad is connected
 * @returns {CommandInput} Gamepad buttons, as an input
 */
declare function gamepad(): CommandInput;
export { gamepad, parseGamepad };
