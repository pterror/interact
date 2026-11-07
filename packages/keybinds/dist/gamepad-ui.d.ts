/**
 * Showing and recording gamepad bindings, for the settings panel, cheatsheet, palette and menus. Recording takes the
 * next button pressed, or with `release` pressed and let go. Every pad is read each frame; buttons already down when
 * recording starts don't count until they've been let go.
 */
import type { InputUI } from './input.js';
/**
 * A gamepad binding as display parts ("rt:up" is ["RT", "Release"])
 * @param {string} binding - The binding
 * @returns {string[]} The parts as shown
 */
declare function formatGamepadParts(binding: string): string[];
/** One recording of a gamepad binding */
declare class GamepadRecorder {
    #private;
    /**
     * Starts reading pads
     * @param {boolean} release - Whether to record a release
     * @param {(binding: string) => void} done - Gets the binding
     */
    constructor(release: boolean, done: (binding: string) => void);
    /** @returns {void} */
    stop(): void;
}
/**
 * Gamepad buttons, shown and recorded as well as listened to. Recording is offered while a pad is connected
 * @returns {InputUI} Gamepad buttons, as an input that can be shown and recorded
 */
declare function gamepadUI(): InputUI;
export { GamepadRecorder, formatGamepadParts, gamepadUI };
