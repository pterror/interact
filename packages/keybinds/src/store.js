/**
 * Binding schemas, and the store of people's rebindings laid over them.
 */

/**
 * @import { BindingOverrides, BindingSchema, Command, Context, Schema } from './command.js'
 */

/**
 * The fields of a person's rebinding of one command or axis
 * @typedef {BindingOverrides[string]} BindingOverride
 */

/**
 * What a command made from bindings may set besides its bindings and handler
 * @typedef {Readonly<{ anyModifiers?: boolean, captureInput?: boolean, when?: (ctx: Context) => boolean }>}
 *   CommandOptions
 */

/**
 * Where a BindingsStore keeps people's overrides. `subscribe` is for storage that can change from elsewhere (another
 * tab, an undo, sync): the store follows it
 * @typedef {object} BindingsStorageFields
 * @property {() => BindingOverrides} load - The current overrides
 * @property {(overrides: BindingOverrides) => void} save - Keeps new overrides
 * @property {(onChange: (overrides: BindingOverrides) => void) => () => void} [subscribe] - Follows changes made
 *   elsewhere; returns a function that stops
 */

/**
 * Where a BindingsStore keeps people's overrides
 * @typedef {Readonly<BindingsStorageFields>} BindingsStorage
 */

/**
 * What a BindingsStore's 'change' event carries: the bindings now, and the overrides they came from
 * @typedef {CustomEvent<Readonly<{ bindings: Schema, overrides: BindingOverrides }>>} BindingsChangeEvent
 */

/**
 * The fields an override can set
 * @type {readonly (keyof BindingOverride)[]}
 */
const OVERRIDE_FIELDS = ['axes', 'gamepad', 'keys', 'mouse']

/**
 * A binding schema as given, for type inference and autocomplete
 * @template {Schema} T
 * @param {T} schema - The schema
 * @returns {T} The same schema
 */
function defineSchema(schema) {
  return schema
}

/**
 * One command's or axis's bindings with a person's override laid over them: each field the override sets
 * @param {BindingSchema} binding - The defaults
 * @param {BindingOverride | undefined} override - The person's changes
 * @returns {BindingSchema} The bindings in effect
 */
function overridden(binding, override) {
  if (override === undefined) {
    return binding
  }
  return {
    ...binding,
    ...(override.axes === undefined ? {} : { axes: override.axes }),
    ...(override.gamepad === undefined ? {} : { gamepad: override.gamepad }),
    ...(override.keys === undefined ? {} : { keys: override.keys }),
    ...(override.mouse === undefined ? {} : { mouse: override.mouse }),
  }
}

/**
 * A schema with people's overrides laid over it. Overrides for ids the schema doesn't have are left out
 * @param {Readonly<Schema>} schema - The default bindings
 * @param {BindingOverrides} overrides - People's changes
 * @returns {Schema} The bindings in effect
 */
function mergeBindings(schema, overrides) {
  /** @type {Record<string, BindingSchema>} */
  const merged = {}
  for (const [id, binding] of Object.entries(schema)) {
    merged[id] = overridden(binding, overrides[id])
  }
  return merged
}

/**
 * Commands from bindings and handlers: one per handler, each with its bindings and options
 * @param {Readonly<Schema>} bindings - The bindings in effect (from mergeBindings(), say)
 * @param {Readonly<Record<string, Command['execute']>>} handlers - What each command does, by id
 * @param {Readonly<Record<string, CommandOptions>>} [options] - More for each command, by id
 * @returns {Command[]} The commands
 * @throws {Error} If a handler has no bindings, which would otherwise never run
 */
function fromBindings(bindings, handlers, options = {}) {
  /** @type {Command[]} */
  const commands = []
  for (const [id, execute] of Object.entries(handlers)) {
    const binding = bindings[id]
    if (binding === undefined) {
      throw new Error(`keybinds: handler "${id}" has no matching binding`)
    }
    commands.push({ id, ...binding, execute, ...options[id] })
  }
  return commands
}

/**
 * Every binding not hidden, with its id, for the settings panel
 * @param {Readonly<Schema>} schema - The bindings
 * @returns {Readonly<{ binding: BindingSchema, id: string }>[]} Them, in the schema's order
 */
function listBindings(schema) {
  /** @type {Readonly<{ binding: BindingSchema, id: string }>[]} */
  const listed = []
  for (const [id, binding] of Object.entries(schema)) {
    if (binding.hidden !== true) {
      listed.push({ binding, id })
    }
  }
  return listed
}

/**
 * Whether a value is a list of strings
 * @param {unknown} value - The value
 * @returns {value is readonly string[]} Whether it is
 */
function isStrings(value) {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

/**
 * A field of something parsed from storage, if it has one of its own
 * @param {object} stored - What was parsed
 * @param {string} field - The field
 * @returns {unknown} Its value, or undefined if it has none
 */
function ownField(stored, field) {
  return Object.hasOwn(stored, field) ? Reflect.get(stored, field) : undefined
}

/**
 * One stored override, its fields that hold lists of bindings
 * @param {unknown} stored - What was stored for one id
 * @returns {BindingOverride} The fields it sets
 */
function overrideOf(stored) {
  if (typeof stored !== 'object' || stored === null) {
    return {}
  }
  /** @type {Record<string, readonly string[]>} */
  const fields = {}
  for (const field of OVERRIDE_FIELDS) {
    const value = ownField(stored, field)
    if (isStrings(value)) {
      fields[field] = value
    }
  }
  return fields
}

/**
 * Overrides as stored: every id's override, its fields read as lists of bindings, anything else left out
 * @param {string} text - The JSON stored
 * @returns {BindingOverrides} The overrides; none if the text isn't an object of them
 */
function parseOverrides(text) {
  /** @type {unknown} */
  const parsed = JSON.parse(text)
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return {}
  }
  /** @type {Record<string, BindingOverride>} */
  const overrides = {}
  for (const id of Object.keys(parsed)) {
    overrides[id] = overrideOf(ownField(parsed, id))
  }
  return overrides
}

/**
 * Storage that keeps overrides in localStorage under one key. Unreadable or unavailable storage (private browsing, a
 * full quota) reads as no overrides, and overrides saved then still apply until the page reloads
 * @param {string} key - The key
 * @returns {BindingsStorage} The storage
 */
function localStorageBindings(key) {
  return {
    load() {
      try {
        return parseOverrides(localStorage.getItem(key) ?? '{}')
      } catch {
        return {}
      }
    },
    save(overrides) {
      try {
        localStorage.setItem(key, JSON.stringify(overrides))
      } catch {
        // The overrides still apply in this page; they just aren't kept
      }
    },
  }
}

/**
 * People's rebindings laid over a schema, kept in localStorage or any BindingsStorage. Dispatches 'change' when they
 * are saved, or when the storage changes from elsewhere
 * @example
 *   const store = new BindingsStore(schema, 'myapp:keybinds')
 *   const elsewhere = new BindingsStore(schema, { load: () => prefs.keys ?? {}, save: (o) => { prefs.keys = o } })
 *   store.addEventListener('change', (event) => render(event.detail.bindings))
 *   store.save({ delete: { keys: ['$mod+d'] } })
 */
class BindingsStore extends EventTarget {
  /**
   * @readonly
   * @type {Readonly<Schema>}
   */
  #schema
  /**
   * @readonly
   * @type {BindingsStorage}
   */
  #storage
  /** @type {BindingOverrides} */
  #overrides
  /** @type {Schema} */
  #bindings
  /** @type {(() => void) | undefined} */
  #unsubscribe

  /**
   * Reads the overrides kept so far, and follows the storage if it can change from elsewhere
   * @param {Readonly<Schema>} schema - The default bindings
   * @param {string | BindingsStorage} storage - A localStorage key, or where to keep overrides
   */
  constructor(schema, storage) {
    super()
    this.#schema = schema
    this.#storage = typeof storage === 'string' ? localStorageBindings(storage) : storage
    this.#overrides = this.#storage.load()
    this.#bindings = mergeBindings(schema, this.#overrides)
    this.#unsubscribe = this.#storage.subscribe?.((overrides) => {
      // Storage that echoes the store's own saves back would otherwise make every change twice
      if (JSON.stringify(overrides) !== JSON.stringify(this.#overrides)) {
        this.#overrides = overrides
        this.#changed()
      }
    })
  }

  /** @returns {Readonly<Schema>} The default bindings */
  get schema() {
    return this.#schema
  }

  /** @returns {Schema} The bindings in effect: the schema with the overrides laid over it */
  get() {
    return this.#bindings
  }

  /** @returns {BindingOverrides} The overrides alone */
  getOverrides() {
    return this.#overrides
  }

  /**
   * Keeps new overrides, and dispatches 'change'
   * @param {BindingOverrides} overrides - The overrides, in place of the ones before
   * @returns {void}
   */
  save(overrides) {
    this.#overrides = overrides
    this.#storage.save(overrides)
    this.#changed()
  }

  /**
   * Stops following the storage's changes
   * @returns {void}
   */
  dispose() {
    this.#unsubscribe?.()
    this.#unsubscribe = undefined
  }

  /** @returns {void} */
  #changed() {
    this.#bindings = mergeBindings(this.#schema, this.#overrides)
    this.dispatchEvent(new CustomEvent('change', { detail: { bindings: this.#bindings, overrides: this.#overrides } }))
  }
}

export { BindingsStore, defineSchema, fromBindings, listBindings, localStorageBindings, mergeBindings }
