/**
 * Binding schemas, and the store of people's rebindings laid over them.
 */
import type { BindingOverrides, BindingSchema, Command, Context, Schema } from './command.js';
export type BindingOverride = BindingOverrides[string];
export type CommandOptions = Readonly<{
    anyModifiers?: boolean;
    captureInput?: boolean;
    when?: (ctx: Context) => boolean;
}>;
export type BindingsStorageFields = {
    /**
     * - The current overrides
     */
    load: () => BindingOverrides;
    /**
     * - Keeps new overrides
     */
    save: (overrides: BindingOverrides) => void;
    /**
     * - Follows changes made
     * elsewhere; returns a function that stops
     */
    subscribe?: (onChange: (overrides: BindingOverrides) => void) => () => void;
};
export type BindingsStorage = Readonly<BindingsStorageFields>;
export type BindingsChangeEvent = CustomEvent<Readonly<{
    bindings: Schema;
    overrides: BindingOverrides;
}>>;
/**
 * A binding schema as given, for type inference and autocomplete
 * @template {Schema} T
 * @param {T} schema - The schema
 * @returns {T} The same schema
 */
declare function defineSchema<T extends Schema>(schema: T): T;
/**
 * A schema with people's overrides laid over it. Overrides for ids the schema doesn't have are left out
 * @param {Readonly<Schema>} schema - The default bindings
 * @param {BindingOverrides} overrides - People's changes
 * @returns {Schema} The bindings in effect
 */
declare function mergeBindings(schema: Readonly<Schema>, overrides: BindingOverrides): Schema;
/**
 * Commands from bindings and handlers: one per handler, each with its bindings and options
 * @param {Readonly<Schema>} bindings - The bindings in effect (from mergeBindings(), say)
 * @param {Readonly<Record<string, Command['execute']>>} handlers - What each command does, by id
 * @param {Readonly<Record<string, CommandOptions>>} [options] - More for each command, by id
 * @returns {Command[]} The commands
 * @throws {Error} If a handler has no bindings, which would otherwise never run
 */
declare function fromBindings(bindings: Readonly<Schema>, handlers: Readonly<Record<string, Command['execute']>>, options?: Readonly<Record<string, CommandOptions>>): Command[];
/**
 * Every binding not hidden, with its id, for the settings panel
 * @param {Readonly<Schema>} schema - The bindings
 * @returns {Readonly<{ binding: BindingSchema, id: string }>[]} Them, in the schema's order
 */
declare function listBindings(schema: Readonly<Schema>): Readonly<{
    binding: BindingSchema;
    id: string;
}>[];
/**
 * Storage that keeps overrides in localStorage under one key. Unreadable or unavailable storage (private browsing, a
 * full quota) reads as no overrides, and overrides saved then still apply until the page reloads
 * @param {string} key - The key
 * @returns {BindingsStorage} The storage
 */
declare function localStorageBindings(key: string): BindingsStorage;
/**
 * People's rebindings laid over a schema, kept in localStorage or any BindingsStorage. Dispatches 'change' when they
 * are saved, or when the storage changes from elsewhere
 * @example
 *   const store = new BindingsStore(schema, 'myapp:keybinds')
 *   const elsewhere = new BindingsStore(schema, { load: () => prefs.keys ?? {}, save: (o) => { prefs.keys = o } })
 *   store.addEventListener('change', (event) => render(event.detail.bindings))
 *   store.save({ delete: { keys: ['$mod+d'] } })
 */
declare class BindingsStore extends EventTarget {
    #private;
    /**
     * Reads the overrides kept so far, and follows the storage if it can change from elsewhere
     * @param {Readonly<Schema>} schema - The default bindings
     * @param {string | BindingsStorage} storage - A localStorage key, or where to keep overrides
     */
    constructor(schema: Readonly<Schema>, storage: string | BindingsStorage);
    /** @returns {Readonly<Schema>} The default bindings */
    get schema(): Readonly<Schema>;
    /** @returns {Schema} The bindings in effect: the schema with the overrides laid over it */
    get(): Schema;
    /** @returns {BindingOverrides} The overrides alone */
    getOverrides(): BindingOverrides;
    /**
     * Keeps new overrides, and dispatches 'change'
     * @param {BindingOverrides} overrides - The overrides, in place of the ones before
     * @returns {void}
     */
    save(overrides: BindingOverrides): void;
    /**
     * Stops following the storage's changes
     * @returns {void}
     */
    dispose(): void;
}
export { BindingsStore, defineSchema, fromBindings, listBindings, localStorageBindings, mergeBindings };
