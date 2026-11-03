/**
 * What a CommandHub builds from its sources: the commands and axes they give, the schema people rebind, and the
 * commands and axes as they listen, with people's rebindings laid over them.
 */
import type { AxisDef, BindingField, Command, Schema } from './command.js';
import type { KeybindsOptions } from './core.js';
import type { AxisInput } from './input.js';
import type { BindingsStore } from './store.js';
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
/**
 * Commands or axes owned by one part of the app, re-read on refresh
 * @template {Readonly<{ id: string }>} T
 * @typedef {Readonly<{ get: () => readonly T[], owner: string }>} Source
 */
/**
 * Where a failure goes: one source or binding failing mustn't take the others down with it
 * @typedef {(error: Error) => void} Report
 */
/**
 * What a source gives the hub: a command, or a definition of one in the app's own shape that `adapt` turns into a
 * command. It has what the schema of people's rebindings is made from
 * @typedef {Readonly<{ category?: string | undefined, description?: string | undefined, gamepad?: readonly string[] |
 *   undefined, hidden?: boolean | undefined, id: string, keys?: readonly string[] | undefined, label: string,
 *   mouse?: readonly string[] | undefined }>} CommandDefinition
 */
/**
 * Turns a definition into a command
 * @template {CommandDefinition} D
 * @typedef {(definition: D) => Command} Adapt
 */
/**
 * Everything the sources give, the earlier source winning an id; a source that throws gives nothing
 * @template {Readonly<{ id: string }>} T
 * @param {readonly Source<T>[]} sources - The sources
 * @param {Readonly<{ kind: string, report: Report }>} how - What they give ("command", "axis"), and where failures go
 * @returns {Map<string, T>} What they gave, by id
 */
declare function fromSources<T extends Readonly<{
    id: string;
}>>(sources: readonly Source<T>[], { kind, report }: Readonly<{
    kind: string;
    report: Report;
}>): Map<string, T>;
/**
 * The schema of every command and axis, by id
 * @param {ReadonlyMap<string, CommandDefinition>} commands - The commands' definitions
 * @param {ReadonlyMap<string, AxisDef>} axes - The axes
 * @param {readonly BindingField[]} fields - The inputs' fields
 * @returns {Schema} The schema
 */
declare function schemaOf(commands: ReadonlyMap<string, CommandDefinition>, axes: ReadonlyMap<string, AxisDef>, fields: readonly BindingField[]): Schema;
export type FieldBindings = Readonly<{
    [field in BindingField]?: readonly string[] | undefined;
}>;
/**
 * A definition as a command, when it is one: it has a function to run. The default `adapt`
 * @param {CommandDefinition} definition - The definition
 * @returns {Command} The command, running the definition's `execute`
 * @throws {TypeError} If it has no `execute` function, so the hub needs an `adapt` for it
 */
declare function commandOf(definition: CommandDefinition): Command;
/**
 * The commands as they listen: each adapted from its definition, with people's rebindings laid over it. One that
 * can't be adapted is left out; one whose bindings can't be read listens to none
 * @template {CommandDefinition} D
 * @param {ReadonlyMap<string, D>} definitions - The definitions
 * @param {BindingsStore<Schema>} bound - The bindings in effect
 * @param {Readonly<{ adapt: Adapt<D>, fields: readonly BindingField[], options: KeybindsOptions, report: Report }>}
 *   how - How definitions become commands, the inputs' fields, the syntax that's on, and where failures go
 * @returns {Map<string, Command>} The commands, by id
 */
declare function liveCommands<D extends CommandDefinition>(definitions: ReadonlyMap<string, D>, bound: BindingsStore<Schema>, { adapt, fields, options, report }: Readonly<{
    adapt: Adapt<D>;
    fields: readonly BindingField[];
    options: KeybindsOptions;
    report: Report;
}>): Map<string, Command>;
/**
 * The axes as they're read: each with people's rebindings, and one whose sources can't be read reading none
 * @param {ReadonlyMap<string, AxisDef>} axes - The axes
 * @param {BindingsStore<Schema>} bound - The bindings in effect
 * @param {Readonly<{ input: AxisInput | undefined, report: Report }>} how - What reads axes, and where failures go
 * @returns {AxisDef[]} The axes
 */
declare function liveAxes(axes: ReadonlyMap<string, AxisDef>, bound: BindingsStore<Schema>, { input, report }: Readonly<{
    input: AxisInput | undefined;
    report: Report;
}>): AxisDef[];
/**
 * Whether a command listens through any of the inputs
 * @param {Command} command - The command
 * @param {readonly BindingField[]} fields - The inputs' fields
 * @returns {boolean} Whether it has bindings there
 */
declare function hasBindings(command: Command, fields: readonly BindingField[]): boolean;
export { commandOf, fromSources, hasBindings, liveAxes, liveCommands, schemaOf };
