/**
 * Every command's bindings through one input, by lookup, checked as they're added: what keybinds() looks presses up
 * in.
 */
import type { Modifiers } from './binding-mods.js';
import type { Command } from './command.js';
import type { KeybindsOptions } from './core.js';
import type { Input } from './input.js';
import type { Step } from './sequences.js';
/**
 * Checks that every command's bindings have an input to read them
 * @param {readonly Command[]} commands - The commands
 * @param {KeybindsOptions} options - The inputs and axes
 * @returns {void}
 * @throws {Error} If a command or axis has bindings no input reads
 */
declare function checkInputs(commands: readonly Command[], options: KeybindsOptions): void;
/** Every command's bindings through one input, by lookup */
declare class BindingIndex {
    #private;
    /**
     * Indexes and checks every binding
     * @param {readonly Command[]} commands - The commands
     * @param {Input} input - The input; an axis input has no command bindings
     * @param {KeybindsOptions} options - Which syntax modules are on
     * @throws {Error} If a binding is invalid or uses syntax that isn't on
     */
    constructor(commands: readonly Command[], input: Input, options: KeybindsOptions);
    /**
     * Checks every binding, as building an index does
     * @param {readonly Command[]} commands - The commands
     * @param {Input} input - The input
     * @param {KeybindsOptions} options - Which syntax modules are on
     * @returns {BindingIndex} The index
     * @throws {Error} If a binding is invalid or uses syntax that isn't on
     */
    static check(commands: readonly Command[], input: Input, options: KeybindsOptions): BindingIndex;
    /** @returns {boolean} Whether any command has a binding here */
    get bound(): boolean;
    /**
     * The commands bound exactly
     * @param {readonly string[]} lookups - An event's lookups, best first
     * @returns {readonly Command[] | undefined} The commands bound to the first that has any
     */
    exact(lookups: readonly string[]): readonly Command[] | undefined;
    /**
     * Adds the `anyModifiers` commands that match
     * @param {readonly string[]} loose - The lookups without modifiers
     * @param {Modifiers} mods - The modifiers held
     * @param {readonly Command[] | undefined} found - What exact bindings found
     * @returns {readonly Command[] | undefined} Those, then the `anyModifiers` commands that match
     */
    withLoose(loose: readonly string[], mods: Modifiers, found: readonly Command[] | undefined): readonly Command[] | undefined;
    /**
     * Every command bound to an event
     * @param {readonly string[]} lookups - An event's lookups, best first
     * @param {readonly string[]} loose - The same without modifiers
     * @param {Modifiers} mods - The modifiers held
     * @returns {readonly Command[] | undefined} The commands bound
     */
    candidates(lookups: readonly string[], loose: readonly string[], mods: Modifiers): readonly Command[] | undefined;
    /**
     * A fresh press as a step of a sequence
     * @param {readonly string[]} lookups - The press's lookups
     * @param {(commands: readonly Command[]) => boolean} starts - Whether any of these may run now
     * @returns {Step | undefined} The step resolved, or undefined without sequences
     */
    step(lookups: readonly string[], starts: (commands: readonly Command[]) => boolean): Step | undefined;
}
export { BindingIndex, checkInputs };
