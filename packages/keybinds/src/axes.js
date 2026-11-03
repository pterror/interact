/**
 * Axes: continuous input read every frame, from mouse movement ("mouse:x"), sticks and triggers ("pad:rx", "pad:lt")
 * or a pair of keys ("keys:a/d"). A leading "-" inverts a source. Showing and recording them is keybinds/axes-ui.
 */

/**
 * @import { ParsedBinding } from './binding.js'
 * @import { AxisEntry } from './axes-listener.js'
 * @import { AxisDef } from './command.js'
 * @import { AxisInput, Dispatch, InputHandle } from './input.js'
 * @import { KeySyntax, ParsedKey } from './keys.js'
 */

import { AxesListener } from './axes-listener.js'
import { NO_MODS } from './binding-mods.js'
import { keyToLookup, parseKey } from './keys.js'
import { PAD_AXES } from './pads.js'

/**
 * Where an axis's value comes from: mouse movement or a stick or trigger, by its `source` ("x", "rt")
 * @typedef {Readonly<{ invert: boolean, kind: 'mouse' | 'pad', source: string }>} DeviceAxis
 */

/**
 * A pair of keys as an axis: the first pushes toward -1, the second toward 1
 * @typedef {Readonly<{ invert: boolean, kind: 'keys', neg: ParsedKey, pos: ParsedKey }>} KeyAxis
 */

/**
 * An axis source parsed; `invert` flips it
 * @typedef {DeviceAxis | KeyAxis} ParsedAxis
 */

const VALID = `mouse:x, mouse:y, pad:${PAD_AXES.join(', pad:')}, keys:<key>/<key>`
const MOUSE_AXES = new Set(['x', 'y'])
const KEY_PAIR = 2

/**
 * A pair of keys, each without modifiers
 * @param {string} pair - "a/d"
 * @param {readonly KeySyntax[]} syntax - The key syntax on
 * @returns {Readonly<{ neg: ParsedKey, pos: ParsedKey }> | undefined} The keys, or undefined if it isn't two
 */
function keyPair(pair, syntax) {
  const keys = pair.split('/')
  const [neg, pos] = keys
  if (keys.length !== KEY_PAIR || neg === undefined || pos === undefined || neg === '' || pos === '') {
    return undefined
  }
  return {
    neg: { ...parseKey(neg, syntax), mods: NO_MODS },
    pos: { ...parseKey(pos, syntax), mods: NO_MODS },
  }
}

/**
 * The source an axis binding names, without its inversion
 * @param {string} kind - Before the colon: "mouse", "pad" or "keys"
 * @param {string} rest - After it
 * @param {readonly KeySyntax[]} syntax - For key pairs, as for keys()
 * @returns {Omit<DeviceAxis, 'invert'> | Omit<KeyAxis, 'invert'> | undefined} The source, or undefined if none
 */
function sourceOf(kind, rest, syntax) {
  if ((kind === 'mouse' && MOUSE_AXES.has(rest)) || (kind === 'pad' && PAD_AXES.includes(rest))) {
    return { kind, source: rest }
  }
  const pair = kind === 'keys' ? keyPair(rest, syntax) : undefined
  return pair === undefined ? undefined : { kind: 'keys', ...pair }
}

/**
 * Parses an axis binding: "mouse:x", "pad:rx", "keys:a/d", with a leading "-" to invert
 * @param {string} binding - The binding
 * @param {readonly KeySyntax[]} [syntax] - For key pairs, as for keys()
 * @returns {ParsedAxis} The source
 * @throws {Error} If the binding names no source
 */
function parseAxis(binding, syntax = []) {
  const written = binding.trim().toLowerCase()
  const invert = written.startsWith('-')
  const [kind = '', ...rest] = written.replace(/^-/u, '').split(':')
  const source = sourceOf(kind, rest.join(':'), syntax)
  if (source === undefined) {
    throw new Error(`Unknown axis "${binding}". Valid: ${VALID}, each with an optional leading "-" to invert`)
  }
  return { ...source, invert }
}

/**
 * An axis and its sources, parsed
 * @param {AxisDef} def - The axis
 * @param {readonly KeySyntax[]} syntax - For key pairs, as for keys()
 * @returns {AxisEntry} Them
 * @throws {Error} Naming the axis, if a source is invalid
 */
function parsedAxis(def, syntax) {
  try {
    return { def, sources: def.axes.map((binding) => parseAxis(binding, syntax)) }
  } catch (error) {
    throw new Error(`Axis "${def.id}": ${error instanceof Error ? error.message : String(error)}`, { cause: error })
  }
}

/**
 * An axis source's normalized form, without its inversion
 * @param {ParsedAxis} parsed - The source
 * @returns {string} Its lookup
 */
function axisToLookup(parsed) {
  if (parsed.kind === 'keys') {
    return `keys:${keyToLookup(parsed.neg)}/${keyToLookup(parsed.pos)}`
  }
  return `${parsed.kind}:${parsed.source}`
}

/**
 * Axes, read with `axis(id)` on what keybinds() returns
 * @param {readonly KeySyntax[]} syntax - For key pairs, as for keys()
 * @returns {AxisInput} Axes, as an input
 */
function axes(...syntax) {
  return {
    axis: true,
    field: 'axes',
    /**
     * Starts listening
     * @param {Dispatch} dispatch - The axes to read, and where to listen
     * @returns {InputHandle} A function that stops, which reads axes too
     * @throws {Error} If an axis has an invalid source
     */
    listen(dispatch) {
      const parsed = new Map(dispatch.axes.map((def) => [def.id, parsedAxis(def, syntax)]))
      const listener = new AxesListener(dispatch, syntax, parsed)
      /** @returns {void} */
      function stop() {
        listener.stop()
      }
      return Object.assign(stop, { axis: listener.axis.bind(listener) })
    },
    /**
     * Parses one source
     * @param {string} binding - The source
     * @param {string} suffix - Its suffix, which an axis can't have
     * @returns {ParsedBinding} The source normalized
     * @throws {Error} If it has a suffix or names no source
     */
    parse(binding, suffix) {
      if (suffix !== '') {
        throw new Error(`Axes have no "${suffix}": "${binding}${suffix}"`)
      }
      return { lookup: axisToLookup(parseAxis(binding, syntax)), loose: '', mods: NO_MODS }
    },
  }
}

export { axes, axisToLookup, parseAxis }
