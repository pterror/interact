/**
 * Running commands in the app's context, for every input alike: whether one may run for a press, and running it.
 */
import type { Command, Context } from './command.js';
import type { KeybindsOptions, Phase } from './core.js';
import type { PressWhere } from './input.js';
/** Running commands, for every input alike */
declare class Runner {
    #private;
    /**
     * Runs commands in the app's context
     * @param {() => Context} context - The app's state now
     * @param {KeybindsOptions} options - What keybinds() was given
     */
    constructor(context: () => Context, options: KeybindsOptions);
    /** @returns {KeybindsOptions} What keybinds() was given */
    get options(): KeybindsOptions;
    /** @returns {readonly Phase[]} The phases that are on */
    get phases(): readonly Phase[];
    /** @returns {Context} The app's state now */
    context(): Context;
    /**
     * Whether a command applies now
     * @param {Command} command - The command
     * @returns {boolean} Whether it does
     */
    active(command: Command): boolean;
    /**
     * Whether a command may run for a press
     * @param {Command} command - The command
     * @param {PressWhere} where - Where the press happened
     * @returns {boolean} Whether it may
     */
    allowed(command: Command, where: PressWhere): boolean;
    /**
     * Runs a command; unless it returns false, it takes the event
     * @param {Command} command - The command
     * @param {Event} event - What triggered it
     * @returns {boolean} Whether it took the event
     */
    execute(command: Command, event: Event): boolean;
}
export { Runner };
