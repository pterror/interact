/**
 * Bindings as strings: "$mod+k", "k:up", "g i". A binding is split into steps and a suffix (":up", ":hold", ":tap"),
 * and each step goes to its input to parse. Syntax whose module isn't on is an error naming it.
 */

/**
 * @import { Modifiers } from './binding-mods.js'
 * @import { BindingSchema, Schema } from './command.js'
 * @import { Input } from './input.js'
 */

/**
 * A binding, normalized. `lookup` is equal for bindings that trigger the same way; `loose` is the lookup without
 * modifiers, which `anyModifiers` commands are found by, and `mods` the modifiers the binding still requires then
 * @typedef {Readonly<{ lookup: string, loose: string, mods: Modifiers }>} ParsedBinding
 */

/**
 * The syntax modules a binding may use, as parsing needs them: each phase's suffixes, and how sequences split steps.
 * keybinds()' options are one
 * @typedef {Readonly<{
 *   holds?: Readonly<{ suffixes: readonly string[] }> | undefined,
 *   releases?: Readonly<{ suffixes: readonly string[] }> | undefined,
 *   sequences?: Readonly<{ steps: (binding: string, suffix: string) => readonly string[] }> | undefined,
 * }>} BindingSyntax
 */

const RELEASE_SUFFIX = ':up'

/** @type {ReadonlyMap<string, string>} */
const SUFFIX_MODULES = new Map([
  [':hold', 'holds()'],
  [':tap', 'holds()'],
  [':up', 'releases()'],
])

/**
 * A lowercase binding's press or release flag, and the rest
 * @param {string} lower - The binding, lowercase
 * @returns {Readonly<{ body: string, release: boolean }>} The binding without ":up", and whether it had it
 */
function splitRelease(lower) {
  const trimmed = lower.trim()
  return { body: trimmed.replace(/:up$/u, ''), release: trimmed.endsWith(RELEASE_SUFFIX) }
}

/**
 * A binding's press form if it's a release, its release form otherwise
 * @param {string} binding - The binding
 * @returns {string} The other form, as the binding was written
 */
function flipRelease(binding) {
  const trimmed = binding.trim()
  return splitRelease(binding.toLowerCase()).release ? trimmed.replace(/:up$/iu, '') : `${trimmed}${RELEASE_SUFFIX}`
}

/**
 * A binding's steps and suffix, whatever syntax modules are on: for showing and comparing bindings
 * @param {string} binding - The binding
 * @returns {Readonly<{ steps: string[], suffix: string }>} Its steps in order, and ":up", ":hold", ":tap" or ""
 */
function splitBinding(binding) {
  const trimmed = binding.trim()
  const suffix = /(?<suffix>:(?:up|hold|tap))$/iu.exec(trimmed)?.groups?.['suffix']?.toLowerCase() ?? ''
  const body = trimmed.slice(0, trimmed.length - suffix.length)
  return {
    steps: body
      .replaceAll(/\s*\+\s*/gu, '+')
      .split(/\s+/u)
      .filter((step) => step !== ''),
    suffix,
  }
}

/**
 * The binding with the suffix a phase owns taken off
 * @param {string} binding - The binding
 * @param {BindingSyntax} syntax - Which phases are on
 * @returns {Readonly<{ body: string, suffix: string }>} The rest, and the suffix or ""
 */
function takeSuffix(binding, syntax) {
  const body = binding.trim()
  const lower = body.toLowerCase()
  const owned = [syntax.releases, syntax.holds].flatMap((phase) => phase?.suffixes ?? [])
  const suffix = owned.findLast((each) => lower.endsWith(each)) ?? ''
  return { body: body.slice(0, body.length - suffix.length), suffix }
}

/**
 * A binding's steps, checking it uses only syntax that's on
 * @param {string} binding - The binding as written, for errors
 * @param {Readonly<{ body: string, suffix: string }>} taken - The binding without its suffix, and the suffix or ""
 * @param {BindingSyntax} syntax - Which syntax modules are on
 * @returns {readonly string[]} Its steps
 */
function stepsOf(binding, { body, suffix }, syntax) {
  const unread = /(?<suffix>:(?:up|hold|tap))$/iu.exec(body)?.groups?.['suffix']?.toLowerCase()
  if (unread !== undefined) {
    throw new Error(`"${binding}" ends in "${unread}", which needs ${SUFFIX_MODULES.get(unread) ?? 'a module'}`)
  }
  if (syntax.sequences) {
    return syntax.sequences.steps(body, suffix)
  }
  if (/\S\s+(?!\+)\S/u.test(body.replaceAll(/\s*\+\s*/gu, '+'))) {
    throw new Error(`"${binding}" has several steps, which needs sequences()`)
  }
  return [body]
}

/**
 * A binding through an input: a suffix (":up") is taken off for the phase that owns it, sequences() splits steps
 * ("g i"), and each step goes to the input to parse
 * @param {Input} input - Whose binding it is
 * @param {string} binding - The binding
 * @param {BindingSyntax} syntax - Which syntax modules are on
 * @returns {ParsedBinding & Readonly<{ steps: readonly string[] }>} The binding normalized, with each step's lookup
 * @throws {Error} If the binding is invalid, or uses syntax that isn't on
 */
function parseBinding(input, binding, syntax) {
  if (binding === '') {
    throw new Error('Invalid binding: an empty string')
  }
  const taken = takeSuffix(binding, syntax)
  const { suffix } = taken
  const parsed = stepsOf(binding, taken, syntax).map((step) => input.parse(step, suffix))
  const last = parsed.at(-1)
  if (last === undefined) {
    throw new Error(`Invalid binding: "${binding}" has no steps`)
  }
  const steps = parsed.map((step) => step.lookup)
  return { lookup: `${steps.join(' ')}${suffix}`, loose: `${last.loose}${suffix}`, mods: last.mods, steps }
}

/** @type {BindingSyntax} */
const ALL_SYNTAX = {
  holds: { suffixes: [':hold', ':tap'] },
  releases: { suffixes: [RELEASE_SUFFIX] },
  sequences: { steps: (binding) => splitBinding(binding).steps },
}

/**
 * A binding's normalized form through an input, whatever syntax it uses, for telling whether two bindings are the
 * same
 * @param {Input} input - Whose binding it is
 * @param {string} binding - The binding
 * @returns {string} Its lookup
 * @throws {Error} If the binding is invalid
 */
function bindingLookup(input, binding) {
  return parseBinding(input, binding, ALL_SYNTAX).lookup
}

/**
 * A binding's lookup, or undefined if it doesn't parse
 * @param {Input} input - Whose binding it is
 * @param {string} binding - The binding
 * @returns {string | undefined} Its lookup
 */
function tryLookup(input, binding) {
  try {
    return bindingLookup(input, binding)
  } catch {
    return undefined
  }
}

/**
 * A binding someone might give a command, to check for conflicts
 * @typedef {Readonly<{ binding: string, except?: string | undefined, input: Input }>} Candidate
 * `except` is a command not to check, usually the one being rebound
 */

/**
 * Each id with its bindings, as a store lists them (BindingsStore#entries())
 * @typedef {Readonly<{ binding: BindingSchema, id: string }>} BindingEntry
 */

/**
 * Whether bindings to check against are a list of entries rather than a schema; a schema is never an array
 * @param {Readonly<Schema> | readonly BindingEntry[]} bindings - The bindings
 * @returns {bindings is readonly BindingEntry[]} Whether they are a list of entries
 */
function isEntries(bindings) {
  return Array.isArray(bindings)
}

/**
 * A schema's ids with their bindings
 * @param {Readonly<Schema>} schema - The schema
 * @returns {BindingEntry[]} Each id with its bindings, in the schema's order
 */
function schemaEntries(schema) {
  /** @type {BindingEntry[]} */
  const entries = []
  for (const [id, binding] of Object.entries(schema)) {
    entries.push({ binding, id })
  }
  return entries
}

/**
 * The first command or axis that a binding would conflict with
 * @param {Readonly<Schema> | readonly BindingEntry[]} bindings - The bindings to check against: a schema, or each id
 *   with its bindings
 * @param {Candidate} candidate - The binding, whose it is, and which command to leave out
 * @returns {Readonly<{ commandId: string, label: string }> | undefined} What it conflicts with, if anything
 */
function findConflict(bindings, { binding, except, input }) {
  const lookup = tryLookup(input, binding)
  if (lookup === undefined) {
    return undefined
  }
  const entries = isEntries(bindings) ? bindings : schemaEntries(bindings)
  const found = entries.find(
    (entry) =>
      entry.id !== except && (entry.binding[input.field] ?? []).some((each) => tryLookup(input, each) === lookup),
  )
  return found === undefined ? undefined : { commandId: found.id, label: found.binding.label }
}

export { RELEASE_SUFFIX, bindingLookup, findConflict, flipRelease, parseBinding, splitBinding, splitRelease }
