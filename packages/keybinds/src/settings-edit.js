/**
 * The settings panel's changes to a store: one command's bindings read, replaced, added, removed, saved as the fields
 * that differ from its defaults, and reset.
 */

/**
 * @import { BindingOverrides } from './command.js'
 * @import { InputUI } from './input.js'
 * @import { BindingOverride } from './schema.js'
 * @import { AnyBindingsStore } from './store.js'
 */

import { bindingLookup } from './binding.js'

const ONE = 1
const NONE = 0

/**
 * Every field that holds bindings
 * @type {readonly Field[]}
 */
const FIELDS = ['axes', 'gamepad', 'keys', 'mouse']

/**
 * A field that holds bindings: one an input reads
 * @typedef {InputUI['field']} Field
 */

/**
 * One command's bindings in the fields the panel shows, each a list
 * @typedef {Readonly<Partial<Record<Field, readonly string[]>>>} Lists
 */

/**
 * Whether two lists of bindings are the same, in order
 * @param {readonly string[]} first - One list
 * @param {readonly string[]} second - Another
 * @returns {boolean} Whether they are
 */
function sameList(first, second) {
  return first.length === second.length && first.every((binding, index) => binding === second[index])
}

/**
 * A command's bindings in effect, in the fields of the inputs shown
 * @param {AnyBindingsStore} store - The store
 * @param {string} id - The command
 * @param {readonly InputUI[]} inputs - The inputs shown
 * @returns {Lists} Its bindings, an empty list in each field it has none
 */
function listsOf(store, id, inputs) {
  const bound = store.lookup(id)
  return Object.fromEntries(inputs.map((input) => [input.field, bound?.[input.field] ?? []]))
}

/**
 * The lists with one binding put in place of another, or added at the end
 * @param {Lists} lists - The bindings
 * @param {Readonly<{ binding: string, field: Field, index: number | undefined }>} change - The binding, its field, and
 *   which it replaces (undefined to add it)
 * @returns {Lists} The bindings after
 */
function withBinding(lists, { binding, field, index }) {
  const list = lists[field] ?? []
  return { ...lists, [field]: index === undefined ? [...list, binding] : list.with(index, binding) }
}

/**
 * The lists without one binding
 * @param {Lists} lists - The bindings
 * @param {Field} field - Its field
 * @param {number} index - Which one
 * @returns {Lists} The bindings after
 */
function withoutBinding(lists, field, index) {
  return { ...lists, [field]: (lists[field] ?? []).toSpliced(index, ONE) }
}

/**
 * Whether a binding is the same as another through an input, whatever syntax either uses. One the input can't read is
 * the same as nothing
 * @param {InputUI} input - The input
 * @param {string} binding - The binding
 * @param {string} lookup - The other's normalized form
 * @returns {boolean} Whether they are the same
 */
function sameAs(input, binding, lookup) {
  try {
    return bindingLookup(input, binding) === lookup
  } catch {
    return false
  }
}

/**
 * The lists without any binding that's the same as one through an input
 * @param {Lists} lists - The bindings
 * @param {InputUI} input - The input
 * @param {string} binding - The binding
 * @returns {Lists} The bindings after
 */
function withoutSame(lists, input, binding) {
  const lookup = bindingLookup(input, binding)
  return { ...lists, [input.field]: (lists[input.field] ?? []).filter((other) => !sameAs(input, other, lookup)) }
}

/**
 * The fields of a command's bindings that differ from its defaults
 * @param {Lists} lists - Its bindings
 * @param {Readonly<Partial<Record<Field, readonly string[] | undefined>>>} defaults - Its defaults
 * @returns {BindingOverride} The fields that differ
 */
function changedFrom(lists, defaults) {
  return Object.fromEntries(
    FIELDS.flatMap((field) => {
      const list = lists[field]
      return list === undefined || sameList(list, defaults[field] ?? []) ? [] : [[field, list]]
    }),
  )
}

/**
 * The overrides without one command's
 * @param {AnyBindingsStore} store - The store
 * @param {string} id - The command
 * @returns {BindingOverrides} The rest
 */
function overridesWithout(store, id) {
  const rest = new Map(Object.entries(store.getOverrides()))
  rest.delete(id)
  return Object.fromEntries(rest)
}

/**
 * Saves a command's bindings as the fields that differ from its defaults, or as none when nothing does
 * @param {AnyBindingsStore} store - The store
 * @param {string} id - The command
 * @param {Lists} lists - Its bindings
 * @returns {void}
 */
function saveLists(store, id, lists) {
  const defaults = store.defaults(id)
  if (defaults === undefined) {
    return
  }
  const changed = changedFrom(lists, defaults)
  const rest = overridesWithout(store, id)
  store.save(Object.keys(changed).length === NONE ? rest : { ...rest, [id]: changed })
}

/**
 * Takes away a command's override, so its defaults are in effect again
 * @param {AnyBindingsStore} store - The store
 * @param {string} id - The command
 * @returns {void}
 */
function resetOne(store, id) {
  store.save(overridesWithout(store, id))
}

export { listsOf, resetOne, saveLists, withBinding, withoutBinding, withoutSame }
