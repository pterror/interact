/**
 * Changing a person's bindings, one edit at a time, each one write: putting a binding in a slot (in place of one, or
 * added), taking one away, putting one in place of another id's same binding, and resetting an id or all to the
 * defaults. What is kept for an id is only the fields that differ from its defaults (changedFields()).
 */

import { bound } from './bound.js'
import { changedFields } from './changed-fields.js'

/** @typedef {'axes' | 'keys' | 'mouse' | 'pad'} Field */

/**
 * @typedef {Readonly<{ keys?: readonly string[], mouse?: readonly string[], pad?: readonly string[],
 *   axes?: readonly string[] }>} Fields
 */

/** @typedef {Readonly<Record<string, Fields>>} Overrides */

/**
 * A binding's place: an id's, in a field, and which of its bindings there (none for a new one, at the end)
 * @typedef {Readonly<{ id: string, field: Field, index?: number | undefined }>} Slot
 */

/**
 * @typedef {Readonly<{
 *   schema: Readonly<Record<string, Fields>>,
 *   overrides: Readonly<{ get: () => Overrides, watch: (listener: () => void) => () => void,
 *     set: (overrides: Overrides) => void }>,
 * }>} RebindOptions
 */

/**
 * Overrides without one id's
 * @param {Overrides} overrides - The overrides
 * @param {string} id - The id
 * @returns {Overrides} The rest
 */
function without(overrides, id) {
  const rest = { ...overrides }
  Reflect.deleteProperty(rest, id)
  return rest
}

/**
 * Edits over a person's overrides
 * @param {RebindOptions} options - The defaults, by id; and the overrides (bindingStore())
 * @returns {Readonly<{
 *   bindings: Readonly<{ get: () => Readonly<Record<string, Fields>>, watch: (listener: () => void) => () => void }>,
 *   changed: (id: string) => boolean,
 *   put: (slot: Slot, binding: string) => void,
 *   remove: (slot: Slot) => void,
 *   replace: (slot: Slot, binding: string, from: string, same: (binding: string) => boolean) => void,
 *   reset: (id: string) => void,
 *   resetAll: () => void,
 * }>} The bindings in effect; whether an id's differ from its defaults; putting a binding in a slot; taking a slot's
 *   away; putting one in a slot and taking from another id every binding in the slot's field that is the same; and
 *   resetting
 */
function rebind({ overrides, schema }) {
  /** @type {Readonly<{ from: Overrides, bindings: Readonly<Record<string, Fields>> }> | undefined} */
  let last = undefined
  const bindings = {
    get() {
      const from = overrides.get()
      if (last?.from !== from) {
        last = { bindings: bound(schema, from), from }
      }
      return last.bindings
    },
    watch: overrides.watch,
  }
  /**
   * An id's override, as its fields after an edit
   * @param {Overrides} next - The overrides so far
   * @param {string} id - The id
   * @param {Field} field - The field edited
   * @param {(list: readonly string[]) => readonly string[]} edit - The field's bindings after the edit
   * @returns {Overrides} The overrides with the edit
   */
  const edited = (next, id, field, edit) => {
    const defaults = schema[id]
    if (defaults === undefined) {
      return next
    }
    const entry = bound({ [id]: defaults }, next)[id] ?? defaults
    const changed = changedFields(defaults, { ...entry, [field]: edit(entry[field] ?? []) })
    const rest = without(next, id)
    return Object.keys(changed).length === 0 ? rest : { ...rest, [id]: changed }
  }
  /**
   * The overrides with a binding put in a slot
   * @param {Overrides} from - The overrides
   * @param {Slot} slot - The slot
   * @param {string} binding - The binding
   * @returns {Overrides} The overrides after
   */
  const putting = (from, { field, id, index }, binding) =>
    edited(from, id, field, (list) => (index === undefined ? [...list, binding] : list.with(index, binding)))
  return {
    bindings,
    changed(id) {
      const defaults = schema[id]
      const now = bindings.get()[id]
      return defaults !== undefined && now !== undefined && Object.keys(changedFields(defaults, now)).length > 0
    },
    put(slot, binding) {
      overrides.set(putting(overrides.get(), slot, binding))
    },
    remove({ field, id, index }) {
      if (index !== undefined) {
        overrides.set(edited(overrides.get(), id, field, (list) => list.toSpliced(index, 1)))
      }
    },
    replace(slot, binding, from, same) {
      const taken = edited(overrides.get(), from, slot.field, (list) => list.filter((each) => !same(each)))
      overrides.set(putting(taken, slot, binding))
    },
    reset(id) {
      if (Object.hasOwn(overrides.get(), id)) {
        overrides.set(without(overrides.get(), id))
      }
    },
    resetAll() {
      if (Object.keys(overrides.get()).length > 0) {
        overrides.set({})
      }
    },
  }
}

export { rebind }
