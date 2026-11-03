/**
 * Axes, listened to for one keybinds(): the keys held and the mouse's movement, kept so each axis can be read when
 * the app asks. Sticks and triggers are read then too.
 */
import type { ParsedAxis } from './axes.js';
import type { AxisDef, AxisValue } from './command.js';
import type { Dispatch } from './input.js';
import type { KeySyntax } from './keys.js';
export type Movement = Readonly<{
    horizontal: number;
    vertical: number;
}>;
export type AxisEntry = Readonly<{
    def: AxisDef;
    sources: readonly ParsedAxis[];
}>;
/**
 * An axis and its sources, parsed
 * @typedef {Readonly<{ def: AxisDef, sources: readonly ParsedAxis[] }>} AxisEntry
 */
/** Axes, listened to for one keybinds() */
declare class AxesListener {
    #private;
    /**
     * Starts listening
     * @param {Dispatch} dispatch - Where to listen
     * @param {readonly KeySyntax[]} syntax - For key pairs, as for keys()
     * @param {ReadonlyMap<string, AxisEntry>} parsed - The axes, by id, with their sources parsed
     */
    constructor(dispatch: Dispatch, syntax: readonly KeySyntax[], parsed: ReadonlyMap<string, AxisEntry>);
    /**
     * Hears keys, the mouse moving, and the window losing focus, which lets go of every key
     * @param {Event} event - A keydown, keyup, mousemove or blur
     * @returns {void}
     */
    handleEvent(event: Event): void;
    /**
     * An axis's value now. Reading it takes the mouse's movement since its last read, applying or not
     * @param {string} id - The axis
     * @returns {AxisValue} Its position, -1 to 1, and the mouse's movement in pixels
     */
    axis(id: string): AxisValue;
    /** @returns {void} */
    stop(): void;
}
export { AxesListener };
