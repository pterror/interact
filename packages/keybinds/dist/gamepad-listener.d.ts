/**
 * Gamepad buttons, read every frame for one keybinds() while a command has a gamepad binding and a pad is connected:
 * a button changing reports a press starting or ending.
 */
import type { Dispatch } from './input.js';
/** Gamepad buttons, read every frame for one keybinds() */
declare class GamepadListener {
    #private;
    /**
     * Starts reading pads, if anything binds a button and the browser has gamepads
     * @param {Dispatch} dispatch - Where presses are reported
     */
    constructor(dispatch: Dispatch);
    /**
     * A pad connected, or polling starts: read pads from the next frame on
     * @returns {void}
     */
    handleEvent(): void;
    /** @returns {void} */
    stop(): void;
}
export { GamepadListener };
