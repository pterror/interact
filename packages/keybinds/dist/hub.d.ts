/**
 * CommandHub: every command on the page, from every source, with one store of people's rebindings.
 */
import { keybinds } from './core.js';
import { BindingsStore } from './store.js';
export type Command = import('./command.js').Command;
export type AxisDef = import('./command.js').AxisDef;
export type AxisValue = import('./command.js').AxisValue;
export type Input = import('./input.js').Input;
export type Schema = import('./command.js').Schema;
export type KeybindsOptions = import('./core.js').KeybindsOptions;
export type BindingsStorage = import('./store.js').BindingsStorage;
export type CommandPalette = import('./components/palette.js').CommandPalette;
export type KeybindCheatsheet = import('./components/cheatsheet.js').KeybindCheatsheet;
export type KeybindSettings = import('./components/settings.js').KeybindSettings;
export type ContextMenu = import('./components/context-menu.js').ContextMenu;
export type CommandHubOptions = {
    /**
     * - What to listen to: e.g. [keys(), mouse()]. With components, their UI
     * halves, which can also be shown and recorded: [keysUI(), mouseUI()]
     */
    inputs?: Input[];
    /**
     * - Components to make
     * inside `host`: any of CommandPalette, KeybindCheatsheet, KeybindSettings, ContextMenu
     */
    components?: (CustomElementConstructor & {
        kind: string;
    })[];
    /**
     * - Where the components go
     */
    host?: HTMLElement;
    /**
     * - localStorage key for people's rebindings (default "keybinds"); the scope is appended
     */
    storageKey?: string;
    /**
     * - Keep rebindings somewhere other than
     * localStorage, separately per scope. Takes the place of `storageKey`
     */
    storage?: (scope: string) => BindingsStorage;
    /**
     * - From releases(), for release bindings ("k:up")
     */
    releases?: import('./core.js').Phase;
    /**
     * - From holds(), for "k:hold" and "k:tap"
     */
    holds?: import('./core.js').Phase;
    /**
     * - From sequences(), for bindings of several steps ("g i")
     */
    sequences?: import('./sequences.js').Sequences;
    /**
     * - From anyModifiers(), for commands with `anyModifiers`
     */
    anyModifiers?: import('./any-modifiers.js').AnyModifiers;
    /**
     * - Passed on to keybinds(): target, capture, onExecute
     */
    listen?: Omit<KeybindsOptions, 'inputs' | 'axes' | 'releases' | 'holds' | 'sequences' | 'anyModifiers'>;
};
/** @typedef {import('./command.js').Command} Command */
/** @typedef {import('./command.js').AxisDef} AxisDef */
/** @typedef {import('./command.js').AxisValue} AxisValue */
/** @typedef {import('./input.js').Input} Input */
/** @typedef {import('./command.js').Schema} Schema */
/** @typedef {import('./core.js').KeybindsOptions} KeybindsOptions */
/** @typedef {import('./store.js').BindingsStorage} BindingsStorage */
/** @typedef {import('./components/palette.js').CommandPalette} CommandPalette */
/** @typedef {import('./components/cheatsheet.js').KeybindCheatsheet} KeybindCheatsheet */
/** @typedef {import('./components/settings.js').KeybindSettings} KeybindSettings */
/** @typedef {import('./components/context-menu.js').ContextMenu} ContextMenu */
/**
 * @typedef {Object} CommandHubOptions
 * @property {Input[]} [inputs] - What to listen to: e.g. [keys(), mouse()]. With components, their UI
 *   halves, which can also be shown and recorded: [keysUI(), mouseUI()]
 * @property {(CustomElementConstructor & { kind: string })[]} [components] - Components to make
 *   inside `host`: any of CommandPalette, KeybindCheatsheet, KeybindSettings, ContextMenu
 * @property {HTMLElement} [host] - Where the components go
 * @property {string} [storageKey] - localStorage key for people's rebindings (default "keybinds"); the scope is appended
 * @property {(scope: string) => BindingsStorage} [storage] - Keep rebindings somewhere other than
 *   localStorage, separately per scope. Takes the place of `storageKey`
 * @property {import('./core.js').Phase} [releases] - From releases(), for release bindings ("k:up")
 * @property {import('./core.js').Phase} [holds] - From holds(), for "k:hold" and "k:tap"
 * @property {import('./sequences.js').Sequences} [sequences] - From sequences(), for bindings of several steps ("g i")
 * @property {import('./any-modifiers.js').AnyModifiers} [anyModifiers] - From anyModifiers(), for commands with `anyModifiers`
 * @property {Omit<KeybindsOptions, 'inputs' | 'axes' | 'releases' | 'holds' | 'sequences' | 'anyModifiers'>} [listen] - Passed on to keybinds(): target, capture, onExecute
 */
/**
 * Every command on the page, from every source, with one store of people's rebindings.
 *
 * Sources are functions, re-read on refresh(), so commands can come and go with the page's
 * state. The hub derives the bindings schema from the commands themselves, lays each person's
 * overrides over it, listens through its inputs, and keeps its components and any command
 * buttons in step.
 *
 * @example
 * const hub = new CommandHub({
 *   inputs: [keys(), mouse()],
 *   components: [CommandPalette, KeybindSettings],
 *   host: document.body,
 *   storageKey: 'myapp:keys',
 * })
 * hub.setSource('editor', () => editorCommands)
 * hub.addContext(() => ({ editing: !!editor.focused }))
 * hub.refresh()
 * hub.bindButtons(toolbar) // <button data-command="save">Save</button>
 *
 * @template {{ id: string, label: string, category?: string | undefined, description?: string | undefined, keys?: readonly string[] | undefined, mouse?: readonly string[] | undefined, gamepad?: readonly string[] | undefined, hidden?: boolean | undefined }} [D=Command]
 * @template {object} [C=Record<string, unknown>] - The context `when` conditions see
 */
export declare class CommandHub<D extends {
    id: string;
    label: string;
    category?: string | undefined;
    description?: string | undefined;
    keys?: readonly string[] | undefined;
    mouse?: readonly string[] | undefined;
    gamepad?: readonly string[] | undefined;
    hidden?: boolean | undefined;
} = Command, C extends object = Record<string, unknown>> extends EventTarget {
    /** @type {Input[]} */
    inputs: Input[];
    /** @type {(scope: string) => BindingsStorage} */
    _storage: (scope: string) => BindingsStorage;
    /** What keybinds() is given besides the commands and axes */
    /** @type {KeybindsOptions} */
    _options: KeybindsOptions;
    /** @type {(def: D) => Command} */
    _adapt: (def: D) => Command;
    /** @type {{ owner: string, get: () => D[] }[]} */
    _sources: {
        owner: string;
        get: () => D[];
    }[];
    /** @type {{ owner: string, get: () => AxisDef[] }[]} */
    _axisSources: {
        owner: string;
        get: () => AxisDef[];
    }[];
    /** @type {Map<string, AxisDef>} */
    _axes: Map<string, AxisDef>;
    /** @type {(() => Partial<C>)[]} */
    _contexts: (() => Partial<C>)[];
    /** @type {Map<string, D>} */
    _defs: Map<string, D>;
    /** @type {Map<string, Command>} */
    _live: Map<string, Command>;
    /** @type {BindingsStore<Schema> | null} */
    _store: BindingsStore<Schema> | null;
    _storeListener: () => void;
    /** @type {ReturnType<typeof keybinds> | null} */
    _unbind: ReturnType<typeof keybinds> | null;
    _scope: string;
    /** @type {Set<Element>} */
    _buttonRoots: Set<Element>;
    /** @type {HTMLElement | null} */
    _lastFocus: HTMLElement | null;
    /** @param {FocusEvent} e */
    _onFocusIn: ((e: FocusEvent) => void) | undefined;
    /** @type {CommandPalette | null} */
    palette: CommandPalette | null;
    /** @type {KeybindCheatsheet | null} */
    cheatsheet: KeybindCheatsheet | null;
    /** @type {KeybindSettings | null} */
    settings: KeybindSettings | null;
    /** @type {ContextMenu | null} */
    menu: ContextMenu | null;
    /**
     * @param {CommandHubOptions & { adapt?: (def: D) => Command }} [options] - `adapt` turns the
     *   sources' definitions into commands, when they aren't commands already
     */
    constructor(options?: CommandHubOptions & {
        adapt?: (def: D) => Command;
    });
    /**
     * Replace the commands owned by `owner` (null removes them). Takes effect on refresh().
     * Earlier sources win when two define the same id.
     * @param {string} owner
     * @param {(() => D[]) | null} get
     */
    setSource(owner: string, get: (() => D[]) | null): void;
    /**
     * Replace the axes owned by `owner` (null removes them). Takes effect on refresh(). Axes are
     * rebindable in the settings panel like commands, and read with axis(id).
     * @param {string} owner
     * @param {(() => AxisDef[]) | null} get
     */
    setAxes(owner: string, get: (() => AxisDef[]) | null): void;
    /**
     * Add to the context that `when` conditions see. Returns a function that removes it again.
     * @param {() => Partial<C>} get
     * @returns {() => void}
     */
    addContext(get: () => Partial<C>): () => void;
    /** @returns {C} */
    context(): C;
    /**
     * Keep rebindings separately per scope (a document type, a game), so a key can mean different
     * things in each. Takes effect on refresh().
     * @param {string} scope
     */
    setScope(scope: string): void;
    /** The store of people's rebindings, as the settings panel edits it. */
    get store(): BindingsStore<import("./command.js").Schema> | null;
    /**
     * Whether a command is held right now: its press fired and that key or button hasn't come up.
     * @param {string} id
     */
    held(id: string): boolean;
    /**
     * An axis's value right now; reading it takes the mouse movement since its last read.
     * @param {string} id
     * @returns {AxisValue}
     */
    axis(id: string): AxisValue;
    /** @returns {D[]} */
    all(): D[];
    /**
     * @param {string} id
     * @returns {D | undefined}
     */
    get(id: string): D | undefined;
    /**
     * Run a command if it's available now. Returns whether it ran.
     * @param {string} id
     * @param {Event} [event]
     * @returns {boolean}
     */
    run(id: string, event?: Event): boolean;
    /** Re-read the sources, rebuild bindings and listeners, and update every component. */
    refresh(): void;
    /** Push the current context into the components and command buttons, so unavailable commands gray out. */
    syncContext(): void;
    openPalette(): void;
    /**
     * Open the context menu with the commands tagged `tag`, at a point on screen.
     * @param {string} tag
     * @param {number} x
     * @param {number} y
     */
    openMenu(tag: string, x: number, y: number): void;
    /**
     * A command's or axis's bindings through one input right now, as shown to people (e.g.
     * "Ctrl+Z" for keys, "Mouse ↔" for axes).
     * @param {string} id
     * @param {string} field - The input's field: "keys", "mouse", "gamepad", "axes"
     * @returns {string[]}
     */
    bindingsFor(id: string, field: string): string[];
    /**
     * Whether an event is one of a command's press bindings, for code that handles the press
     * itself, like a drag that should start on a rebindable mouse button.
     * @param {string} id
     * @param {Event} event
     * @returns {boolean}
     */
    matches(id: string, event: Event): boolean;
    /**
     * Make every element with `data-command="<id>"` under `root` run that command when clicked and
     * be disabled while it isn't available. Returns a function that stops.
     * @param {Element} root
     * @returns {() => void}
     */
    bindButtons(root: Element): () => void;
    /**
     * @param {Element} root
     * @param {Record<string, unknown>} ctx
     */
    _paintButtons(root: Element, ctx: Record<string, unknown>): void;
    /** Stop listening, and detach from the store. */
    destroy(): void;
}
