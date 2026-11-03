/**
 * A CommandHub's bindings: the commands and axes its sources give, the store of people's rebindings over them, and
 * keybinds() listening with the result.
 */
import type { AxisDef, AxisValue, Command, Context, Schema } from './command.js';
import type { KeybindsOptions } from './core.js';
import type { Adapt, CommandDefinition, Report, Source } from './hub-commands.js';
import type { Input } from './input.js';
import type { BindingsStorage } from './bindings-storage.js';
import { BindingsStore } from './store.js';
export type Rebuild<D extends CommandDefinition> = Readonly<{
    axisSources: readonly Source<AxisDef>[];
    context: () => Context;
    scope: string;
    sources: readonly Source<D>[];
}>;
export type Made<D extends CommandDefinition> = Readonly<{
    adapt: Adapt<D>;
    changed: () => void;
    options: KeybindsOptions;
    report: Report;
    storage: (scope: string) => BindingsStorage;
}>;
/**
 * What the bindings are rebuilt from: the sources, the scope rebindings are kept in, and the context now
 * @template {CommandDefinition} D
 * @typedef {Readonly<{ axisSources: readonly Source<AxisDef>[], context: () => Context, scope: string,
 *   sources: readonly Source<D>[] }>} Rebuild
 */
/**
 * What the bindings are made with: how definitions become commands, keybinds()' options, where rebindings are kept
 * per scope, what to do when they change, and where failures go
 * @template {CommandDefinition} D
 * @typedef {Readonly<{ adapt: Adapt<D>, changed: () => void, options: KeybindsOptions, report: Report,
 *   storage: (scope: string) => BindingsStorage }>} Made
 */
/**
 * A hub's commands, axes, rebindings, and the listening they make
 * @template {CommandDefinition} D - What its sources give
 */
declare class HubBindings<D extends CommandDefinition> {
    #private;
    /**
     * Bindings with nothing yet, until rebuilt
     * @param {Made<D>} made - What they're made with
     */
    constructor(made: Made<D>);
    /** @returns {readonly Input[]} The inputs listened to */
    get inputs(): readonly Input[];
    /** @returns {Readonly<{ holds: boolean, releases: boolean, sequences: boolean }>} Which binding syntax is on */
    get syntax(): Readonly<{
        holds: boolean;
        releases: boolean;
        sequences: boolean;
    }>;
    /** @returns {BindingsStore<Schema> | undefined} The store of people's rebindings */
    get store(): BindingsStore<Schema> | undefined;
    /** @returns {ReadonlyMap<string, D>} Every definition, as its source gave it, by id */
    get commands(): ReadonlyMap<string, D>;
    /** @returns {ReadonlyMap<string, Command>} Every command as it listens, with people's rebindings, by id */
    get live(): ReadonlyMap<string, Command>;
    /**
     * Re-reads the sources, and rebuilds the store and the listening
     * @param {Rebuild<D>} rebuild - The sources, the scope, and the context
     * @returns {void}
     */
    rebuild({ axisSources, context, scope, sources }: Rebuild<D>): void;
    /**
     * @param {string} id - A command
     * @param {Context} context - The context now
     * @returns {Command | undefined} The command as it listens, if it applies in the context
     */
    applying(id: string, context: Context): Command | undefined;
    /**
     * @param {string} id - A command
     * @returns {boolean} Whether its press fired and that key or button hasn't come up
     */
    held(id: string): boolean;
    /**
     * @param {string} id - An axis
     * @returns {AxisValue} Its value now; reading it takes the mouse movement since its last read
     */
    axis(id: string): AxisValue;
    /**
     * A command's or axis's bindings through one input right now, as shown to people. A command's are what it listens
     * with (an unreadable binding was dropped); an axis's are in the store
     * @param {string} id - The command or axis
     * @param {string} field - The input's field: "keys", "mouse", "gamepad", "axes"
     * @returns {string[]} The bindings
     */
    bindingsFor(id: string, field: string): string[];
    /**
     * @param {string} id - A command
     * @param {Event} event - An event
     * @returns {boolean} Whether the event is one of the command's press bindings
     */
    matches(id: string, event: Event): boolean;
    /**
     * Stops listening, and detaches from the store
     * @returns {void}
     */
    stop(): void;
}
export { HubBindings };
