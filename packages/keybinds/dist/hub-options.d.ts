/**
 * What a CommandHub is made with, and what it makes from that: keybinds()' options, where rebindings are kept, and
 * its components.
 */
import type { AnyModifiers } from './any-modifiers.js';
import type { Context } from './command.js';
import type { Adapt, CommandDefinition } from './hub-commands.js';
import type { KeybindsOptions, Phase } from './core.js';
import type { ComponentClasses } from './hub-components.js';
import type { Input } from './input.js';
import type { Sequences } from './sequences.js';
import type { BindingsStorage } from './store.js';
/**
 * @import { AnyModifiers } from './any-modifiers.js'
 * @import { Context } from './command.js'
 * @import { Adapt, CommandDefinition } from './hub-commands.js'
 * @import { KeybindsOptions, Phase } from './core.js'
 * @import { ComponentClasses } from './hub-components.js'
 * @import { Input } from './input.js'
 * @import { Sequences } from './sequences.js'
 * @import { BindingsStorage } from './store.js'
 */
import { HubComponents } from './hub-components.js';
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
 * @typedef {object} CommandHubFields
 * @property {readonly Input[]} [inputs] - What to listen to: [keys(), mouse()]. With components, their UI halves,
 *   which can also be shown and recorded: [keysUI(), mouseUI()]
 * @property {ComponentClasses} [components] - Components to make inside `host`
 * @property {HTMLElement} [host] - Where the components go
 * @property {string} [storageKey] - localStorage key for people's rebindings (default "keybinds"); the scope is
 *   appended
 * @property {(scope: string) => BindingsStorage} [storage] - Keeps rebindings somewhere other than localStorage,
 *   separately per scope, in place of `storageKey`
 * @property {Phase} [releases] - From releases(), for release bindings ("k:up")
 * @property {Phase} [holds] - From holds(), for "k:hold" and "k:tap"
 * @property {Sequences} [sequences] - From sequences(), for bindings of several steps ("g i")
 * @property {AnyModifiers} [anyModifiers] - From anyModifiers(), for commands with `anyModifiers`
 * @property {Omit<KeybindsOptions, 'anyModifiers' | 'axes' | 'holds' | 'inputs' | 'releases' | 'sequences'>} [listen]
 *   - Passed on to keybinds(): target, capture, onExecute
 */
/**
 * What a CommandHub is made with, besides its definitions' adapt and its context
 * @typedef {Readonly<CommandHubFields>} HubSettings
 */
/**
 * What a CommandHub is made with: `context` gives the app's state, which parts added with addContext() are laid over;
 * `adapt` turns the sources' definitions into commands, when they aren't commands already
 * @template {CommandDefinition} D
 * @template {Context} C
 * @typedef {HubSettings & Readonly<{ adapt?: Adapt<D>, context: () => C }>} CommandHubOptions
 */
/**
 * What keybinds() is given besides the commands and axes: the listening options, the inputs, and the syntax that's on
 * @param {HubSettings} options - The hub's options
 * @returns {KeybindsOptions} The options for keybinds()
 */
declare function listenOptions(options: HubSettings): KeybindsOptions;
/**
 * Where people's rebindings are kept, per scope
 * @param {HubSettings} options - The hub's options
 * @returns {(scope: string) => BindingsStorage} The storage for a scope
 */
declare function storageOf({ storage, storageKey }: HubSettings): (scope: string) => BindingsStorage;
/**
 * The hub's components, made inside the host, if there are any
 * @param {HubSettings} options - The hub's options
 * @param {() => void} opened - What to do when the cheatsheet opens
 * @returns {HubComponents | undefined} The components
 * @throws {TypeError} If there are components but no host, or inputs they can't show
 */
declare function componentsOf({ components, host, inputs }: HubSettings, opened: () => void): HubComponents | undefined;
/**
 * Where a hub's failures go: an `error` event (an ErrorEvent) on the hub, and reportError() when nobody prevents it
 * @param {EventTarget} hub - The hub
 * @returns {(error: Error) => void} Reports a failure
 */
declare function reporterFor(hub: EventTarget): (error: Error) => void;
export { componentsOf, listenOptions, reporterFor, storageOf };
