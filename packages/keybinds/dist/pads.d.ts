/**
 * The browser's "standard" gamepad layout, and the pads connected now. Gamepads have no events for their buttons or
 * sticks, so whatever reads them reads every pad each frame.
 */
export type Pad = Readonly<{
    axes: readonly number[];
    buttons: readonly Readonly<{
        pressed: boolean;
        value: number;
    }>[];
    index: number;
}>;
/**
 * A pad as read in one frame: what keybinds uses of the browser's `Gamepad`
 * @typedef {Readonly<{ axes: readonly number[], buttons: readonly Readonly<{ pressed: boolean, value: number }>[],
 *   index: number }>} Pad
 */
/** The standard layout's buttons, by index. Face buttons are named by position: an Xbox pad's A is "a", and so is a
 * PlayStation pad's cross */
declare const GAMEPAD_BUTTONS: string[];
/**
 * Other names for buttons: by direction, PlayStation's, and the controls' own names
 * @type {ReadonlyMap<string, string>}
 */
declare const GAMEPAD_ALIASES: ReadonlyMap<string, string>;
/**
 * Whether the browser can read gamepads at all
 * @returns {boolean} Whether it can
 */
declare function hasPads(): boolean;
/**
 * The pads connected now
 * @returns {Pad[]} Each, as the browser reads it this frame
 */
declare function connectedPads(): Pad[];
/**
 * Which of a pad's standard buttons are down
 * @param {Pad} pad - The pad
 * @returns {boolean[]} Whether each is down, by index in GAMEPAD_BUTTONS
 */
declare function pressedButtons(pad: Pad): boolean[];
/** The standard layout's sticks by their index in `Gamepad.axes`, then its triggers */
declare const PAD_AXES: string[];
/**
 * Where a stick or trigger is, summed over every connected pad
 * @param {string} source - One of PAD_AXES
 * @returns {number} Where it is
 */
declare function padAxis(source: string): number;
/**
 * One pad's sticks and triggers as the browser reads them, in the order of PAD_AXES
 * @param {Pad} pad - The pad
 * @returns {number[]} Where each is
 */
declare function padAxesOf(pad: Pad): number[];
export { GAMEPAD_ALIASES, GAMEPAD_BUTTONS, PAD_AXES, connectedPads, hasPads, padAxesOf, padAxis, pressedButtons };
