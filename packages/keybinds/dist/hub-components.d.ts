/**
 * A CommandHub's components: made inside its host from the classes given, kept in step with its commands, store and
 * context, and giving focus back when an overlay closes.
 */
import type { KeybindCheatsheet } from './cheatsheet.js';
import type { Command, Context } from './command.js';
import type { ContextMenu } from './components/context-menu.js';
import type { KeybindSettings } from './components/settings.js';
import type { Input } from './input.js';
import type { CommandPalette } from './palette.js';
import type { BindingsStore } from './store.js';
export type ComponentClass<E extends HTMLElement> = (new () => E) & Readonly<{
    kind: string;
}>;
export type ComponentClasses = Readonly<{
    cheatsheet?: ComponentClass<KeybindCheatsheet>;
    menu?: ComponentClass<ContextMenu>;
    palette?: ComponentClass<CommandPalette>;
    settings?: ComponentClass<KeybindSettings>;
}>;
/** The components a hub keeps in step */
declare class HubComponents {
    #private;
    /**
     * @readonly
     * @type {CommandPalette | undefined}
     */
    readonly palette: CommandPalette | undefined;
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
     * @readonly
     * @type {ContextMenu | undefined}
     */
    readonly menu: ContextMenu | undefined;
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
     * @param {Readonly<{ live: ReadonlyMap<string, Command>, store: BindingsStore | undefined, syntax: Readonly<{ holds:
     *   boolean, releases: boolean, sequences: boolean }> }>} bindings - The hub's commands as they listen, its store, and
     *   which binding syntax is on
     * @returns {void}
     */
    show({ live, store, syntax }: Readonly<{
        live: ReadonlyMap<string, Command>;
        store: BindingsStore | undefined;
        syntax: Readonly<{
            holds: boolean;
            releases: boolean;
            sequences: boolean;
        }>;
    }>): void;
    /**
     * Opens the context menu with the commands tagged `tag`, at a point on screen
     * @param {string} tag - The menu's tag
     * @param {Readonly<{ x: number, y: number }>} position - Where, in viewport pixels
     * @returns {void}
     */
    openMenu(tag: string, position: Readonly<{
        x: number;
        y: number;
    }>): void;
    /**
     * Gives the components the context now. An open palette or menu keeps acting on where it was opened from, though
     * taking focus changed the context
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
