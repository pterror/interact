/**
 * Showing and recording gamepad bindings, for the settings panel, cheatsheet, palette and menus.
 */
import type { InputUI } from './input.js';
/**
 * A gamepad binding as display parts ("rt:up" is ["RT", "Release"])
 * @param {string} binding - The binding
 * @returns {string[]} The parts as shown
 */
declare function formatGamepadParts(binding: string): string[];
/**
 * Gamepad buttons, shown and recorded as well as listened to. Recording is offered while a pad is connected
 * @returns {InputUI} Gamepad buttons, as an input that can be shown and recorded
 */
declare function gamepadUI(): InputUI;
export { formatGamepadParts, gamepadUI };
