/**
 * One input's presses: what keybinds() hands an input to report them to, and the commands each runs.
 */
import type { AxisValue, Command } from './command.js';
import type { Input, PressWhere } from './input.js';
import type { Runner } from './runner.js';
export type Happened = Readonly<{
    event: Event;
    where: PressWhere;
}>;
/**
 * A press's event, and where it happened
 * @typedef {Readonly<{ event: Event, where: PressWhere }>} Happened
 */
/** @type {AxisValue} */
declare const STILL: AxisValue;
/** One input's presses, and the commands they run */
declare class InputListener {
    #private;
    /**
     * Starts listening through an input
     * @param {Runner} runner - What runs commands
     * @param {readonly Command[]} commands - The commands
     * @param {Input} input - The input
     */
    constructor(runner: Runner, commands: readonly Command[], input: Input);
    /**
     * Whether a command is held through this input
     * @param {string} id - The command's id
     * @returns {boolean} Whether a press it fired for is still going
     */
    held(id: string): boolean;
    /** @returns {boolean} Whether this input reads axes */
    get readsAxes(): boolean;
    /**
     * An axis's value
     * @param {string} id - The axis's id
     * @returns {AxisValue} Its value, still if this input doesn't read axes
     */
    axis(id: string): AxisValue;
    /** @returns {void} */
    stop(): void;
}
export { InputListener, STILL };
