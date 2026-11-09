/**
 * Which id a binding is already bound to: the first, other than the one being rebound, with a binding in the same
 * field that has the same normal form. A binding that doesn't parse conflicts with nothing, and is the same as nothing.
 */

/** @typedef {'axes' | 'keys' | 'mouse' | 'pad'} Field */

/**
 * @typedef {Readonly<{ keys?: readonly string[], mouse?: readonly string[], pad?: readonly string[],
 *   axes?: readonly string[] }>} Entry
 */

/**
 * @typedef {Readonly<{ binding: string, field: Field, lookup: (binding: string) => string, except?: string }>}
 *   Candidate
 */

/**
 * A binding's normal form, or nothing if it doesn't parse
 * @param {(binding: string) => string} lookup - The normal form
 * @param {string} binding - The binding
 * @returns {string | undefined} Its normal form
 */
function tryLookup(lookup, binding) {
  try {
    return lookup(binding)
  } catch {
    return undefined
  }
}

/**
 * The id a binding would conflict with
 * @param {Readonly<Record<string, Entry>>} bindings - The bindings in effect, by id (bound()'s)
 * @param {Candidate} candidate - The binding; its field; its normal form through that field's input (bindingLookup()
 *   of the input's parser, or an axis's lookup); and the id not to check, usually the one being rebound
 * @returns {string | undefined} The id it is already bound to, if any
 */
function findConflict(bindings, { binding, except, field, lookup }) {
  const wanted = tryLookup(lookup, binding)
  if (wanted === undefined) {
    return undefined
  }
  return Object.keys(bindings).find(
    (id) => id !== except && (bindings[id]?.[field] ?? []).some((each) => tryLookup(lookup, each) === wanted),
  )
}

export { findConflict }
