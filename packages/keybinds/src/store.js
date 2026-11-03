/**
 * The store of people's rebindings over a schema, read one id at a time, and commands and lists made from it.
 */

/**
 * @import { BindingsStorage } from './bindings-storage.js'
 * @import { BindingOverrides, Command, Context, Schema } from './command.js'
 * @import { Bound, BoundEntry, Id, SchemaOf } from './schema.js'
 */

import { BindingsChangeEvent } from './bindings-change.js'
import { localStorageBindings } from './bindings-storage.js'
import { idsOf, isId, withOverride } from './schema.js'

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
class BindingsStore extends EventTarget {
  /**
   * @readonly
   * @type {T}
   */
  #schema
  /**
   * @readonly
   * @type {BindingsStorage}
   */
  #storage
  /** @type {BindingOverrides} */
  #overrides
  /** @type {(() => void) | undefined} */
  #unsubscribe

  /**
   * Reads the overrides kept so far, and follows the storage if it can change from elsewhere
   * @param {T} schema - The default bindings
   * @param {string | BindingsStorage} storage - A localStorage key, or where to keep overrides
   */
  constructor(schema, storage) {
    super()
    this.#schema = schema
    this.#storage = typeof storage === 'string' ? localStorageBindings(storage) : storage
    this.#overrides = this.#storage.load()
    this.#unsubscribe = this.#storage.subscribe?.((overrides) => {
      // Storage that echoes the store's own saves back would otherwise make every change twice
      if (JSON.stringify(overrides) !== JSON.stringify(this.#overrides)) {
        this.#overrides = overrides
        this.dispatchEvent(new BindingsChangeEvent(overrides))
      }
    })
  }

  /** @returns {T} The default bindings */
  get schema() {
    return this.#schema
  }

  /** @returns {Id<T>[]} The schema's ids, in its order */
  ids() {
    return idsOf(this.#schema)
  }

  /**
   * Whether a string is one of the schema's ids, for ids that come from elsewhere (an element, an event)
   * @param {string} id - The string
   * @returns {id is Id<T>} Whether the schema has it
   */
  has(id) {
    return isId(this.#schema, id)
  }

  /**
   * One id's bindings in effect: its schema entry with the person's override laid over it
   * @template {Id<T>} K
   * @param {K} id - The command or axis
   * @returns {Bound<T[K]>} Its bindings now
   */
  get(id) {
    return withOverride(this.#schema[id], this.#overrides[id])
  }

  /**
   * The bindings in effect for an id that comes from elsewhere (an element, an event, a list of commands)
   * @param {string} id - Maybe one of the schema's ids
   * @returns {Bound<T[Id<T>]> | undefined} Its bindings now, or undefined if the schema hasn't the id
   */
  lookup(id) {
    return this.has(id) ? this.get(id) : undefined
  }

  /**
   * The schema's own bindings for an id that comes from elsewhere, without the person's override
   * @param {string} id - Maybe one of the schema's ids
   * @returns {T[Id<T>] | undefined} Its default bindings, or undefined if the schema hasn't the id
   */
  defaults(id) {
    return this.has(id) ? this.#schema[id] : undefined
  }

  /** @returns {BoundEntry<T>[]} Every id's bindings in effect, in the schema's order */
  entries() {
    return this.ids().map((id) => ({ binding: this.get(id), id }))
  }

  /** @returns {BindingOverrides} The overrides alone */
  getOverrides() {
    return this.#overrides
  }

  /**
   * Keeps new overrides, and dispatches a BindingsChangeEvent
   * @param {BindingOverrides} overrides - The overrides, in place of the ones before
   * @returns {void}
   */
  save(overrides) {
    this.#overrides = overrides
    this.#storage.save(overrides)
    this.dispatchEvent(new BindingsChangeEvent(overrides))
  }

  /**
   * Stops following the storage's changes
   * @returns {void}
   */
  dispose() {
    this.#unsubscribe?.()
    this.#unsubscribe = undefined
  }
}

/**
 * Every id's bindings: from a store, as they are in effect; from a schema, as given
 * @template {SchemaOf<T>} T
 * @param {T | BindingsStore<T>} bindings - A schema, or a store over one
 * @returns {BoundEntry<T>[]} Each id with its bindings, in the schema's order
 */
function entriesOf(bindings) {
  if (bindings instanceof BindingsStore) {
    return bindings.entries()
  }
  return idsOf(bindings).map((id) => ({ binding: withOverride(bindings[id], undefined), id }))
}

/**
 * Commands from bindings and handlers: one per handler, each with its bindings and options
 * @template {SchemaOf<T>} T
 * @param {T | BindingsStore<T>} bindings - A schema, or a store whose overrides apply
 * @param {Readonly<Partial<Record<Id<T>, Command['execute']>>>} handlers - What each command does, by id
 * @param {Readonly<Partial<Record<Id<T>, CommandOptions>>>} [options] - More for each command, by id
 * @returns {Command[]} The commands
 * @throws {Error} If a handler has no bindings, which would otherwise never run
 */
function fromBindings(bindings, handlers, options) {
  const schema = bindings instanceof BindingsStore ? bindings.schema : bindings
  /** @type {Command[]} */
  const commands = []
  for (const id of Object.keys(handlers)) {
    if (!isId(schema, id)) {
      throw new Error(`keybinds: handler "${id}" has no matching binding`)
    }
    const execute = handlers[id]
    if (execute !== undefined) {
      const binding = bindings instanceof BindingsStore ? bindings.get(id) : schema[id]
      commands.push({ id, ...binding, execute, ...options?.[id] })
    }
  }
  return commands
}

/**
 * Every binding not hidden, with its id, for the settings panel
 * @template {SchemaOf<T>} T
 * @param {T | BindingsStore<T>} bindings - A schema, or a store whose overrides apply
 * @returns {BoundEntry<T>[]} Them, in the schema's order
 */
function listBindings(bindings) {
  return entriesOf(bindings).filter(({ binding }) => binding.hidden !== true)
}

export { BindingsStore, entriesOf, fromBindings, listBindings }
