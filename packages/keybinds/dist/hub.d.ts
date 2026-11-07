/**
 * The CommandHub: every command on the page from every source, the store of people's rebindings over them, keybinds()
 * listening with the result, the context `when` conditions see, and the cheatsheet and settings panel it makes and
 * keeps in step. Menus, a palette and command buttons follow it as a command system instead (`hub.commandSystem()`).
 */
import type { AnyModifiers } from './any-modifiers.js';
import type { BindingsStorage } from './bindings-storage.js';
import type { KeybindCheatsheet } from './cheatsheet.js';
import type { AxisDef, AxisValue, BindingField, Command, Context, Schema } from './command.js';
import type { CommandSystem, CommandSystemOptions } from './command-system.js';
import type { KeybindsOptions, Phase } from './core.js';
import type { Input } from './input.js';
import type { Sequences } from './sequences.js';
import type { KeybindSettings } from './settings.js';
import { BindingsStore } from './store.js';
export type Source<T extends Readonly<{
    id: string;
}>> = Readonly<{
    get: () => readonly T[];
    owner: string;
}>;
export type Report = (error: Error) => void;
export type CommandDefinition = Readonly<{
    category?: string | undefined;
    description?: string | undefined;
    gamepad?: readonly string[] | undefined;
    hidden?: boolean | undefined;
    id: string;
    keys?: readonly string[] | undefined;
    label: string;
    mouse?: readonly string[] | undefined;
}>;
export type Adapt<D extends CommandDefinition> = (definition: D) => Command;
export type FieldBindings = Readonly<{
    [field in BindingField]?: readonly string[] | undefined;
}>;
export type ComponentClass<E extends HTMLElement> = (new () => E) & Readonly<{
    kind: string;
}>;
export type ComponentClasses = Readonly<{
    cheatsheet?: ComponentClass<KeybindCheatsheet>;
    settings?: ComponentClass<KeybindSettings>;
}>;
export type CommandHubFields = {
    /**
     * - What to listen to: [keys(), mouse()]. With components, their UI halves,
     * which can also be shown and recorded: [keysUI(), mouseUI()]
     */
    inputs?: readonly Input[];
    /**
     * - Components to make inside `host`
     */
    components?: ComponentClasses;
    /**
     * - Where the components go
     */
    host?: HTMLElement;
    /**
     * - localStorage key for people's rebindings (default "keybinds"); the scope is
     * appended
     */
    storageKey?: string;
    /**
     * - Keeps rebindings somewhere other than localStorage,
     * separately per scope, in place of `storageKey`
     */
    storage?: (scope: string) => BindingsStorage;
    /**
     * - From releases(), for release bindings ("k:up")
     */
    releases?: Phase;
    /**
     * - From holds(), for "k:hold" and "k:tap"
     */
    holds?: Phase;
    /**
     * - From sequences(), for bindings of several steps ("g i")
     */
    sequences?: Sequences;
    /**
     * - From anyModifiers(), for commands with `anyModifiers`
     */
    anyModifiers?: AnyModifiers;
    /**
     * - Passed on to keybinds(): target, capture, onExecute
     */
    listen?: Omit<KeybindsOptions, 'anyModifiers' | 'axes' | 'holds' | 'inputs' | 'releases' | 'sequences'>;
};
export type HubSettings = Readonly<CommandHubFields>;
export type CommandHubOptions<D extends CommandDefinition, C extends Context> = HubSettings & Readonly<{
    adapt?: Adapt<D>;
    context: () => C;
}>;
/**
 * A definition as a command, when it is one: it has a function to run, and each field a command has beyond a
 * definition's is absent or of the command's type; its `when` holds when its answer is truthy. The default `adapt`
 * @param {CommandDefinition} definition - The definition
 * @returns {Command} The command, running the definition's `execute`
 * @throws {TypeError} If it has no `execute` function, so the hub needs an `adapt` for it, or a field of the wrong type
 */
declare function commandOf(definition: CommandDefinition): Command;
/**
 * Giving focus back: closing the settings panel returns focus to where it was outside the overlays (the text being
 * edited, say), before the chosen command runs; the command can still move it elsewhere
 */
declare class FocusReturn {
    #private;
    /**
     * Starts following focus, and the overlays closing
     * @param {readonly HTMLElement[]} overlays - The settings panel, if there is one
     */
    constructor(overlays: readonly HTMLElement[]);
    /**
     * Notes where focus went, unless it's inside a component, even in a component's shadow DOM, which isn't somewhere to
     * come back to; or gives it back when an overlay closes, if focus is lost: nowhere, on the page itself, or still in
     * the overlay
     * @param {Event} event - A focusin, or an overlay's close
     * @returns {void}
     */
    handleEvent(event: Event): void;
    /**
     * Stops following focus
     * @returns {void}
     */
    stop(): void;
}
/**
 * Every command on the page, from every source, with one store of people's rebindings. Sources are re-read on
 * refresh(); the hub lays people's overrides over their commands, listens, and keeps its components in step. Menus, a
 * palette and command buttons follow it as a command system (`commandSystem()`). What fails is left out and reported
 * as an `error` event, or to reportError()
 * @template {CommandDefinition} [D=Command] - What its sources give: commands, or definitions `adapt` turns into them
 * @template {Context} [C=Context] - The context `when` conditions see
 * @example
 *   const hub = new CommandHub({ context: () => ({ editing: editor.focused }), inputs: [keysUI()] })
 *   hub.setSource('editor', () => editorCommands)
 */
declare class CommandHub<D extends CommandDefinition = Command, C extends Context = Context> extends EventTarget {
    #private;
    /**
     * Makes the hub, and its components inside `host`
     * @param {CommandHubOptions<D, C>} options - Its context, inputs, storage and components
     * @throws {TypeError} If there are components but no host, or inputs they can't show
     */
    constructor(options: CommandHubOptions<D, C>);
    /** @returns {readonly Input[]} What it listens to */
    get inputs(): readonly Input[];
    /** @returns {KeybindCheatsheet | undefined} The cheatsheet it made */
    get cheatsheet(): KeybindCheatsheet | undefined;
    /** @returns {KeybindSettings | undefined} The settings panel it made */
    get settings(): KeybindSettings | undefined;
    /** @returns {BindingsStore<Schema> | undefined} The store of people's rebindings, as the settings panel edits it */
    get store(): BindingsStore<Schema> | undefined;
    /**
     * Replaces the commands owned by `owner` (undefined removes them), from refresh() on. Earlier sources win an id
     * @param {string} owner - Which part of the app they're from
     * @param {(() => readonly D[]) | undefined} get - Gives the commands, or their definitions
     * @returns {void}
     */
    setSource(owner: string, get: (() => readonly D[]) | undefined): void;
    /**
     * Replaces the axes owned by `owner` (undefined removes them) from refresh() on, rebindable and read with axis(id)
     * @param {string} owner - Which part of the app they're from
     * @param {(() => readonly AxisDef[]) | undefined} get - Gives the axes
     * @returns {void}
     */
    setAxes(owner: string, get: (() => readonly AxisDef[]) | undefined): void;
    /**
     * Adds a part laid over the context `when` conditions see
     * @param {() => Partial<C>} get - Gives part of the context
     * @returns {() => void} A function that removes it again
     */
    addContext(get: () => Partial<C>): () => void;
    /** @returns {C} The context now: the app's, with every part added laid over it, later ones over earlier */
    context(): C;
    /**
     * Keeps rebindings per scope (a document type, a game) from refresh() on, so a key can mean different things in each
     * @param {string} scope - The scope
     * @returns {void}
     */
    setScope(scope: string): void;
    /**
     * @param {string} id - A command
     * @returns {boolean} Whether it's held right now: its press fired and that key or button hasn't come up
     */
    held(id: string): boolean;
    /**
     * @param {string} id - An axis
     * @returns {AxisValue} Its value right now; reading it takes the mouse movement since its last read
     */
    axis(id: string): AxisValue;
    /** @returns {D[]} Every command or definition, as its source gave it */
    all(): D[];
    /**
     * @param {string} id - A command's id
     * @returns {D | undefined} The command or definition, as its source gave it
     */
    get(id: string): D | undefined;
    /**
     * This hub as a command system, for a bridge to menus, a palette and buttons
     * @param {CommandSystemOptions} [options] - How it searches and ranks: a matcher, a scorer, a source of further
     *   commands
     * @returns {CommandSystem} The command system
     */
    commandSystem(options?: CommandSystemOptions): CommandSystem;
    /**
     * Runs a command if it applies now
     * @param {string} id - The command
     * @param {Event} [event] - What made it run
     * @returns {boolean} Whether it ran
     */
    run(id: string, event?: Event): boolean;
    /**
     * Re-reads the sources, rebuilds the store over a new schema and the listening, and updates every component. A
     * definition that can't be adapted is left out; a command whose bindings can't be read listens to none, and an axis
     * whose sources can't be read reads none
     * @returns {void}
     */
    refresh(): void;
    /**
     * Pushes the context now into the cheatsheet, and tells whoever listens for `context` events (a command system's
     * bridge, so its menus, palette and buttons) that which commands apply may have changed
     * @returns {void}
     */
    syncContext(): void;
    /**
     * A command's or axis's bindings through one input now, as shown to people ("Ctrl+Z" for keys, "Mouse ↔" for axes).
     * A command's are what it listens with (an unreadable binding was dropped); an axis's are in the store
     * @param {string} id - The command or axis
     * @param {string} field - The input's field: "keys", "mouse", "gamepad", "axes"
     * @returns {string[]} The bindings
     */
    bindingsFor(id: string, field: string): string[];
    /**
     * Whether an event is one of a command's press bindings, for code that handles the press itself, like a drag that
     * should start on a rebindable mouse button
     * @param {string} id - The command
     * @param {Event} event - The event
     * @returns {boolean} Whether it is
     */
    matches(id: string, event: Event): boolean;
    /**
     * Stops listening, and detaches from the store
     * @returns {void}
     */
    destroy(): void;
}
export { CommandHub, FocusReturn, commandOf };
