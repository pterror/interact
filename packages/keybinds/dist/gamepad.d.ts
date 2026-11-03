/**
 * Gamepad buttons: bindings like "a", "rt" or "start:up". Gamepad buttons take no modifiers.
 * Showing and recording them is keybinds/gamepad-ui.
 */
export type Input = import('./input.js').Input;
export type Press = import('./input.js').Press;
/** @typedef {import('./input.js').Input} Input */
/** @typedef {import('./input.js').Press} Press */
export declare const GAMEPAD_BUTTONS: string[];
/** @type {Record<string, string>} */
export declare const GAMEPAD_ALIASES: Record<string, string>;
export declare const hasPads: () => boolean;
/**
 * Gamepad buttons. Gamepads have no events for their buttons, so they're read every frame, but
 * only while a command has a gamepad binding and a pad is connected.
 * @returns {Input}
 */
export declare function gamepad(): Input;
