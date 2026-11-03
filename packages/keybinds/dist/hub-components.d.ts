/**
 * A CommandHub's components: the cheatsheet and the settings panel, made inside its host from the classes given, kept
 * in step with its commands, store and context, and the panel giving focus back when it closes. Menus, a palette and
 * command buttons follow the hub as a command system instead (`hub.commandSystem()`).
 */
import type { KeybindCheatsheet } from './cheatsheet.js';
import type { Command, Context, Schema } from './command.js';
import type { KeybindSettings } from './settings.js';
import type { Input } from './input.js';
import type { BindingsStore } from './store.js';
export type ComponentClass<E extends HTMLElement> = (new () => E) & Readonly<{
    kind: string;
}>;
export type ComponentClasses = Readonly<{
    cheatsheet?: ComponentClass<KeybindCheatsheet>;
    settings?: ComponentClass<KeybindSettings>;
}>;
/** The components a hub keeps in step */
declare class HubComponents {
    #private;
    /**
     * @readonly
     * @type {KeybindCheatsheet | undefined}
     */
    readonly cheatsheet: KeybindCheatsheet | undefined;
    /**
     * @readonly
     * @type {KeybindSettings | undefined}
     */
    readonly settings: KeybindSettings | undefined;
    /**
     * Makes the components inside the host
     * @param {ComponentClasses} classes - The components to make
     * @param {Readonly<{ host: HTMLElement, inputs: readonly Input[], opened: () => void }>} where - The host, the
     *   inputs bindings are shown through, and what to do when the cheatsheet opens
     * @throws {TypeError} If an input can't be shown
     */
    constructor(classes: ComponentClasses, { host, inputs, opened }: Readonly<{
        host: HTMLElement;
        inputs: readonly Input[];
        opened: () => void;
    }>);
    /**
     * Gives each component the commands, store and syntax as they are now
     * @param {Readonly<{ live: ReadonlyMap<string, Command>, store: BindingsStore<Schema> | undefined, syntax: Readonly<{ holds:
     *   boolean, releases: boolean, sequences: boolean }> }>} bindings - The hub's commands as they listen, its store, and
     *   which binding syntax is on
     * @returns {void}
     */
    show({ live, store, syntax }: Readonly<{
        live: ReadonlyMap<string, Command>;
        store: BindingsStore<Schema> | undefined;
        syntax: Readonly<{
            holds: boolean;
            releases: boolean;
            sequences: boolean;
        }>;
    }>): void;
    /**
     * Gives the cheatsheet the context now
     * @param {Context} context - The context
     * @returns {void}
     */
    sync(context: Context): void;
    /**
     * Stops giving focus back
     * @returns {void}
     */
    stop(): void;
}
export { HubComponents };
