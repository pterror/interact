/**
 * What to keep as one id's override: the fields of its bindings that differ from its defaults. None differing is an
 * empty override, which is no override.
 */

/**
 * @typedef {Readonly<{ keys?: readonly string[], mouse?: readonly string[], pad?: readonly string[],
 *   axes?: readonly string[] }>} Fields
 */

/** @type {readonly (keyof Fields)[]} */
const FIELDS = ['axes', 'keys', 'mouse', 'pad']

/**
 * The fields that differ
 * @param {Fields} defaults - The id's defaults
 * @param {Fields} bindings - Its bindings now; a field left out is as the defaults have it
 * @returns {Fields} Each field of `bindings` whose list isn't the defaults' (a field the defaults lack is an empty
 *   list)
 */
function changedFields(defaults, bindings) {
  return Object.fromEntries(
    FIELDS.flatMap((field) => {
      const list = bindings[field]
      const before = defaults[field] ?? []
      const same = list === undefined || (list.length === before.length && list.every((one, at) => one === before[at]))
      return same ? [] : [[field, list]]
    }),
  )
}

export { changedFields }
