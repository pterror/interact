/**
 * Where a BindingsStore keeps people's overrides, and the one that keeps them in localStorage.
 */

/**
 * @import { BindingOverrides } from './command.js'
 * @import { BindingOverride } from './schema.js'
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
 * The fields an override can set
 * @type {readonly (keyof BindingOverride)[]}
 */
const OVERRIDE_FIELDS = ['axes', 'gamepad', 'keys', 'mouse']

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

export { localStorageBindings }
