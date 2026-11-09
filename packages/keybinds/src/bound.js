/**
 * The bindings in effect: each id of a schema with a person's override laid over it, each field the override sets in
 * place of the schema's. An override for an id the schema hasn't is left out; an id with no override keeps its
 * schema entry as it is.
 */

/** @typedef {'axes' | 'keys' | 'mouse' | 'pad'} Field */

/**
 * The fields a person can rebind
 * @typedef {Readonly<{ keys?: readonly string[], mouse?: readonly string[], pad?: readonly string[],
 *   axes?: readonly string[] }>} Rebindable
 */

/**
 * One id's bindings in effect: its schema entry, with the fields an override can set typed as any bindings
 * @template {Rebindable} E
 * @typedef {Readonly<Omit<E, Field>> & Rebindable} Bound
 */

/** @type {readonly Field[]} */
const FIELDS = ['axes', 'keys', 'mouse', 'pad']

/**
 * Each id's bindings in effect
 * @template {Rebindable} E
 * @param {Readonly<Record<string, E>>} schema - The defaults, by id
 * @param {Readonly<Record<string, Rebindable>>} overrides - A person's changes, by id
 * @returns {Readonly<Record<string, Bound<E>>>} The bindings in effect, by id, in the schema's order
 */
function bound(schema, overrides) {
  return Object.fromEntries(
    Object.keys(schema).flatMap((id) => {
      const entry = schema[id]
      const override = Object.hasOwn(overrides, id) ? overrides[id] : undefined
      if (entry === undefined || override === undefined) {
        return entry === undefined ? [] : [[id, entry]]
      }
      const fields = FIELDS.flatMap((field) => {
        const value = override[field]
        return value === undefined ? [] : [[field, value]]
      })
      return [[id, { ...entry, ...Object.fromEntries(fields) }]]
    }),
  )
}

export { bound }
