/**
 * Axis bindings as strings: mouse movement ("mouse:x", "mouse:y"), a stick or trigger ("pad:rx", "pad:lt"), or a pair
 * of keys, the first toward -1 and the second toward 1 ("keys:a/d"). A leading "-" inverts one.
 */

import { keyParse } from './key-parse.js'

/**
 * @typedef {Readonly<{ ctrl: boolean, alt: boolean, shift: boolean, meta: boolean }>} Modifiers
 */

/**
 * @typedef {Readonly<{
 *   alias?: (name: string) => string | undefined,
 *   accepts?: (key: string, mods: Modifiers) => boolean,
 *   shifted?: (key: string) => string | undefined,
 * }>} KeySyntax
 */

/**
 * An axis binding parsed: whether it is inverted; its lookup, without the inversion ("keys:a/d"); and its source: the
 * mouse's or a pad's axis, or two keys by their lookups without modifiers
 * @typedef {Readonly<{ invert: boolean, lookup: string } & (
 *   | { kind: 'mouse' | 'pad', axis: string }
 *   | { kind: 'keys', negative: string, positive: string })>} ParsedAxis
 */

/** @type {readonly string[]} */
const PAD_AXES = ['lx', 'ly', 'rx', 'ry', 'lt', 'rt']

const VALID = `mouse:x, mouse:y, pad:${PAD_AXES.join(', pad:')}, keys:<key>/<key>`

/**
 * One key of a pair, by its lookup without modifiers
 * @param {string} key - The key
 * @param {string} binding - The axis binding, for errors
 * @param {readonly KeySyntax[]} syntax - The key syntax on
 * @returns {string} Its lookup
 * @throws {Error} Naming the binding, if the key is invalid
 */
function keyOf(key, binding, syntax) {
  try {
    return keyParse(key, syntax).bare
  } catch (error) {
    throw new Error(`Axis "${binding}": ${error instanceof Error ? error.message : String(error)}`, { cause: error })
  }
}

/**
 * Parses an axis binding
 * @param {string} binding - The binding: "-pad:ry"
 * @param {readonly KeySyntax[]} [syntax] - The key syntax on, for a pair of keys
 * @returns {ParsedAxis} It normalized
 * @throws {Error} If it names no axis, or a key pair isn't two keys
 */
function axisParse(binding, syntax = []) {
  const written = binding.trim().toLowerCase()
  const invert = written.startsWith('-')
  const [kind = '', ...rest] = written.slice(invert ? 1 : 0).split(':')
  const source = rest.join(':')
  if ((kind === 'mouse' && (source === 'x' || source === 'y')) || (kind === 'pad' && PAD_AXES.includes(source))) {
    return { axis: source, invert, kind, lookup: `${kind}:${source}` }
  }
  const keys = source.split('/')
  const [first, second] = keys
  if (kind !== 'keys' || keys.length !== 2 || first === undefined || second === undefined) {
    throw new Error(`Unknown axis "${binding}". Valid: ${VALID}, each with an optional leading "-" to invert`)
  }
  const negative = keyOf(first, binding, syntax)
  const positive = keyOf(second, binding, syntax)
  return { invert, kind, lookup: `keys:${negative}/${positive}`, negative, positive }
}

export { axisParse }
