/**
 * The keybinds() function: commands as data, context as state. Every kind of input (keys, mouse, gamepad, axes) is its own
 * module, handed to keybinds() by whoever uses it; this knows only commands, context and presses.
 */
import type { AnyModifiers } from './any-modifiers.js';
import type { AxisDef, AxisValue, Command, Context } from './command.js';
import type { Input, Press, PressWhere } from './input.js';
import type { Sequences } from './sequences.js';
export type PhaseRunFields = {
    /**
     * - The press
     */
    press: Press;
    /**
     * - The event that started or ended it
     */
    event: Event;
    /**
     * - Commands bound to this press with a suffix
     */
    bound: (suffix: string) => readonly Command[] | undefined;
    /**
     * - Runs the first candidate that may run and takes the
     * event, noting it on the press
     */
    fire: (candidates: readonly Command[]) => boolean;
    /**
     * - Whether a command may run now: it applies, the input isn't
     * blocked, and it isn't being typed into (unless the command captures input)
     */
    allowed: (command: Command) => boolean;
    /**
     * - Runs a command whatever `allowed` says; true if it took the event
     */
    execute: (command: Command) => boolean;
    /**
     * - Whether the press is still going
     */
    held: () => boolean;
};
export type PhaseRun = Readonly<PhaseRunFields>;
export type Phase = Readonly<{
    down?: (run: PhaseRun) => void;
    suffixes: readonly string[];
    up?: (run: PhaseRun) => boolean;
}>;
export type KeybindsFields = {
    /**
     * - What to listen to: [keys(), mouse()]. A command bound through an input that
     * isn't here is an error
     */
    inputs?: readonly Input[];
    /**
     * - From releases(): bindings to an input coming up ("k:up")
     */
    releases?: Phase;
    /**
     * - From holds(): bindings to holding an input ("k:hold") and to a short press ("k:tap")
     */
    holds?: Phase;
    /**
     * - From sequences(): bindings of several steps ("g i")
     */
    sequences?: Sequences;
    /**
     * - From anyModifiers(): commands whose bindings match whatever other
     * modifiers are held
     */
    anyModifiers?: AnyModifiers;
    /**
     * - Where to listen (default: the window)
     */
    target?: EventTarget;
    /**
     * - Called after a command takes an event
     */
    onExecute?: (command: Command, ctx: Context) => void;
    /**
     * - Listen in the capture phase, so a bound key reaches its command before anything
     * under the target (an editor, say) handles it. A command that doesn't apply, or returns false, leaves the event be
     */
    capture?: boolean;
    /**
     * - Continuous inputs, read with `axis(id)` on what keybinds() returns
     */
    axes?: readonly AxisDef[];
};
export type KeybindsOptions = Readonly<KeybindsFields>;
export type Keybinds = (() => void) & Readonly<{
    axis: (id: string) => AxisValue;
    held: (id: string) => boolean;
}>;
export type Happened = Readonly<{
    event: Event;
    where: PressWhere;
}>;
/**
 * Listens for commands' bindings through the inputs given
 * @param {readonly Command[]} commands - The commands
 * @param {() => Context} [getContext] - The app's state now, which `when` conditions and commands see
 * @param {KeybindsOptions} [options] - The inputs, syntax modules and axes
 * @returns {Keybinds} A function that stops listening, with `held(id)` and `axis(id)`
 * @throws {Error} If a binding is invalid, uses syntax that isn't on, or has no input to read it
 * @example
 * const stop = keybinds([
 *   { id: 'delete', label: 'Delete selected', keys: ['Backspace', 'Delete'],
 *     when: (ctx) => ctx.hasSelection === true, execute: () => deleteSelected() },
 * ], () => ({ hasSelection: selectedId() !== undefined }), { inputs: [keys(), mouse()] })
 */
declare function keybinds(commands: readonly Command[], getContext?: () => Context, options?: KeybindsOptions): Keybinds;
/**
 * Checks every command up front, to catch typos early
 * @param {readonly Command[]} commands - The commands
 * @param {KeybindsOptions} options - As for keybinds(): the inputs, and the syntax modules used
 * @returns {true} When every command is fine
 * @throws {Error} If a command has no id, or a binding is invalid
 */
declare function validateCommands(commands: readonly Command[], options: KeybindsOptions): true;
export { keybinds, validateCommands };
