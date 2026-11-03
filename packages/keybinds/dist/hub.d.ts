/**
 * @import { KeybindCheatsheet } from './cheatsheet.js'
 * @import { AxisDef, AxisValue, Command, Context, Schema } from './command.js'
 * @import { CommandSystem } from './command-system.js'
 * @import { ContextMenu } from './context-menu.js'
 * @import { KeybindSettings } from './settings.js'
 * @import { CommandDefinition, Source } from './hub-commands.js'
 * @import { HubComponents } from './hub-components.js'
 * @import { CommandHubOptions } from './hub-options.js'
 * @import { Input } from './input.js'
 * @import { CommandPalette } from './palette.js'
 * @import { BindingsStore } from './store.js'
 */
import type { KeybindCheatsheet } from './cheatsheet.js';
import type { AxisDef, AxisValue, Command, Context, Schema } from './command.js';
import type { CommandSystem } from './command-system.js';
import type { ContextMenu } from './context-menu.js';
import type { KeybindSettings } from './settings.js';
import type { CommandDefinition } from './hub-commands.js';
import type { CommandHubOptions } from './hub-options.js';
import type { Input } from './input.js';
import type { CommandPalette } from './palette.js';
import type { BindingsStore } from './store.js';
/**
 * Every command on the page, from every source, with one store of people's rebindings. Sources are re-read on
 * refresh(); the hub lays people's overrides over their commands, listens, and keeps its components and buttons in
 * step. What fails is left out and reported as an `error` event, or to reportError()
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
    /** @returns {CommandPalette | undefined} The palette it made */
    get palette(): CommandPalette | undefined;
    /** @returns {KeybindCheatsheet | undefined} The cheatsheet it made */
    get cheatsheet(): KeybindCheatsheet | undefined;
    /** @returns {KeybindSettings | undefined} The settings panel it made */
    get settings(): KeybindSettings | undefined;
    /** @returns {ContextMenu | undefined} The context menu it made */
    get menu(): ContextMenu | undefined;
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
    /** @returns {CommandSystem} This hub as a command system, for a bridge to menus, a palette and buttons */
    commandSystem(): CommandSystem;
    /**
     * Runs a command if it applies now
     * @param {string} id - The command
     * @param {Event} [event] - What made it run
     * @returns {boolean} Whether it ran
     */
    run(id: string, event?: Event): boolean;
    /**
     * Re-reads the sources, rebuilds bindings and listeners, and updates every component
     * @returns {void}
     */
    refresh(): void;
    /**
     * Pushes the context now into the components and command buttons, so commands that don't apply gray out, and tells
     * whoever listens for `context` events that which commands apply may have changed
     * @returns {void}
     */
    syncContext(): void;
    /**
     * Opens the palette, with the commands as they are now
     * @returns {void}
     */
    openPalette(): void;
    /**
     * Opens the context menu with the commands tagged `tag`, at a point on screen
     * @param {string} tag - The menu's tag
     * @param {number} x - Where, in pixels from the viewport's left
     * @param {number} y - Where, in pixels from the viewport's top
     * @returns {void}
     */
    openMenu(tag: string, x: number, y: number): void;
    /**
     * A command's or axis's bindings through one input now, as shown to people ("Ctrl+Z" for keys, "Mouse ↔" for axes)
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
     * Makes every `data-command="<id>"` element under `root` run that command when clicked, disabled while it can't
     * @param {Element} root - Where the buttons are
     * @returns {() => void} A function that stops
     */
    bindButtons(root: Element): () => void;
    /**
     * Stops listening, and detaches from the store
     * @returns {void}
     */
    destroy(): void;
}
export { CommandHub };
