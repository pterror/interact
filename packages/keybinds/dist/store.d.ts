/**
 * The store of people's rebindings over a schema, read one id at a time, and commands and lists made from it.
 */
import type { BindingsStorage } from './bindings-storage.js';
import type { BindingOverrides, Command, Context, Schema } from './command.js';
import type { Bound, BoundEntry, Id, SchemaOf } from './schema.js';
export type AnyBindingsStore = Pick<BindingsStore<Schema>, 'addEventListener' | 'defaults' | 'dispatchEvent' | 'entries' | 'getOverrides' | 'has' | 'ids' | 'lookup' | 'removeEventListener' | 'save' | 'schema'>;
export type CommandOptions = Readonly<{
    anyModifiers?: boolean;
    captureInput?: boolean;
    when?: (ctx: Context) => boolean;
}>;
/**
 * A store as code that takes any store reads it: by ids it holds as strings. A store over any schema is one
 * @typedef {Pick<BindingsStore<Schema>, 'addEventListener' | 'defaults' | 'dispatchEvent' | 'entries' | 'getOverrides'
 *   | 'has' | 'ids' | 'lookup' | 'removeEventListener' | 'save' | 'schema'>} AnyBindingsStore
 */
/**
 * What a command made from bindings may set besides its bindings and handler
 * @typedef {Readonly<{ anyModifiers?: boolean, captureInput?: boolean, when?: (ctx: Context) => boolean }>}
 *   CommandOptions
 */
/**
 * People's rebindings over a schema, kept in localStorage or any BindingsStorage. The schema and the overrides stay
 * apart: each id's bindings in effect are read with get(id). Dispatches a BindingsChangeEvent when the overrides are
 * saved, or when the storage changes from elsewhere
 * @example
 *   const store = new BindingsStore(schema, 'myapp:keybinds')
 *   const elsewhere = new BindingsStore(schema, { load: () => prefs.keys ?? {}, save: (o) => { prefs.keys = o } })
 *   store.addEventListener('change', () => render(store.get('save')))
 *   store.save({ delete: { keys: ['$mod+d'] } })
 * @template {SchemaOf<T>} T
 */
declare class BindingsStore<T extends SchemaOf<T>> extends EventTarget {
    #private;
    /**
     * Reads the overrides kept so far, and follows the storage if it can change from elsewhere
     * @param {T} schema - The default bindings
     * @param {string | BindingsStorage} storage - A localStorage key, or where to keep overrides
     */
    constructor(schema: T, storage: string | BindingsStorage);
    /** @returns {T} The default bindings */
    get schema(): T;
    /** @returns {Id<T>[]} The schema's ids, in its order */
    ids(): Id<T>[];
    /**
     * Whether a string is one of the schema's ids, for ids that come from elsewhere (an element, an event)
     * @param {string} id - The string
     * @returns {id is Id<T>} Whether the schema has it
     */
    has(id: string): id is Id<T>;
    /**
     * One id's bindings in effect: its schema entry with the person's override laid over it
     * @template {Id<T>} K
     * @param {K} id - The command or axis
     * @returns {Bound<T[K]>} Its bindings now
     */
    get<K extends Id<T>>(id: K): Bound<T[K]>;
    /**
     * The bindings in effect for an id that comes from elsewhere (an element, an event, a list of commands)
     * @param {string} id - Maybe one of the schema's ids
     * @returns {Bound<T[Id<T>]> | undefined} Its bindings now, or undefined if the schema hasn't the id
     */
    lookup(id: string): Bound<T[Id<T>]> | undefined;
    /**
     * The schema's own bindings for an id that comes from elsewhere, without the person's override
     * @param {string} id - Maybe one of the schema's ids
     * @returns {T[Id<T>] | undefined} Its default bindings, or undefined if the schema hasn't the id
     */
    defaults(id: string): T[Id<T>] | undefined;
    /** @returns {BoundEntry<T>[]} Every id's bindings in effect, in the schema's order */
    entries(): BoundEntry<T>[];
    /** @returns {BindingOverrides} The overrides alone */
    getOverrides(): BindingOverrides;
    /**
     * Keeps new overrides, and dispatches a BindingsChangeEvent
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
/**
 * Every id's bindings: from a store, as they are in effect; from a schema, as given
 * @template {SchemaOf<T>} T
 * @param {T | BindingsStore<T>} bindings - A schema, or a store over one
 * @returns {BoundEntry<T>[]} Each id with its bindings, in the schema's order
 */
declare function entriesOf<T extends SchemaOf<T>>(bindings: T | BindingsStore<T>): BoundEntry<T>[];
/**
 * Commands from bindings and handlers: one per handler, each with its bindings and options
 * @template {SchemaOf<T>} T
 * @param {T | BindingsStore<T>} bindings - A schema, or a store whose overrides apply
 * @param {Readonly<Partial<Record<Id<T>, Command['execute']>>>} handlers - What each command does, by id
 * @param {Readonly<Partial<Record<Id<T>, CommandOptions>>>} [options] - More for each command, by id
 * @returns {Command[]} The commands
 * @throws {Error} If a handler has no bindings, which would otherwise never run
 */
declare function fromBindings<T extends SchemaOf<T>>(bindings: T | BindingsStore<T>, handlers: Readonly<Partial<Record<Id<T>, Command['execute']>>>, options?: Readonly<Partial<Record<Id<T>, CommandOptions>>>): Command[];
/**
 * Every binding not hidden, with its id, for the settings panel
 * @template {SchemaOf<T>} T
 * @param {T | BindingsStore<T>} bindings - A schema, or a store whose overrides apply
 * @returns {BoundEntry<T>[]} Them, in the schema's order
 */
declare function listBindings<T extends SchemaOf<T>>(bindings: T | BindingsStore<T>): BoundEntry<T>[];
export { BindingsStore, entriesOf, fromBindings, listBindings };
