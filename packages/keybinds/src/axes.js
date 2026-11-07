/**
 * Axes: continuous input read every frame, from mouse movement ("mouse:x"), sticks and triggers ("pad:rx", "pad:lt")
 * or a pair of keys ("keys:a/d"). A leading "-" inverts a source. Showing and recording them is keybinds/axes-ui.
 * Listened to for one keybinds(), the keys held and the mouse's movement are kept so each axis can be read when the
 * app asks; sticks and triggers are read then too.
 */

/**
 * @import { ParsedBinding } from './binding.js'
 * @import { AxisDef, AxisValue } from './command.js'
 * @import { AxisInput, Dispatch, InputHandle } from './input.js'
 * @import { KeySyntax, ParsedKey } from './keys.js'
 */

import { NO_MODS } from './binding-mods.js'
import { isActive } from './command.js'
import { inInput, windowOf } from './input.js'
import { eventToKeyLookups, keyId, keyToLookup, parseKey } from './keys.js'
import { anyOverlayOpen } from './modal.js'
import { PAD_AXES, padAxis } from './pads.js'

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

/**
 * Mouse movement in pixels, along each direction
 * @typedef {Readonly<{ horizontal: number, vertical: number }>} Movement
 */

/** @type {Movement} */
const STILL = { horizontal: 0, vertical: 0 }

/** @type {AxisValue} */
const ZERO = { delta: 0, position: 0 }

/**
 * An axis and its sources, parsed
 * @typedef {Readonly<{ def: AxisDef, sources: readonly ParsedAxis[] }>} AxisEntry
 */

/**
 * A pair of keys, each without modifiers
 * @param {string} pair - "a/d"
 * @param {readonly KeySyntax[]} syntax - The key syntax on
 * @returns {Readonly<{ neg: ParsedKey, pos: ParsedKey }> | undefined} The keys, or undefined if it isn't two
 */
function keyPair(pair, syntax) {
  const keys = pair.split('/')
  const [neg, pos] = keys
  if (keys.length !== 2 || neg === undefined || pos === undefined || neg === '' || pos === '') {
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

/** Axes, listened to for one keybinds() */
class AxesListener {
  /**
   * @readonly
   * @type {Dispatch}
   */
  #dispatch
  /**
   * @readonly
   * @type {readonly KeySyntax[]}
   */
  #syntax
  /**
   * @readonly
   * @type {ReadonlyMap<string, AxisEntry>}
   */
  #axes
  /**
   * The keys down now, by key id, as their lookups without modifiers
   * @readonly
   * @type {Map<string, readonly string[]>}
   */
  #keys = new Map()
  /**
   * Where each axis last read the mouse's movement so far
   * @readonly
   * @type {Map<string, Movement>}
   */
  #read = new Map()
  /**
   * The mouse's movement so far
   * @type {Movement}
   */
  #moved = STILL
  /**
   * @readonly
   * @type {EventTarget}
   */
  #window

  /**
   * Starts listening
   * @param {Dispatch} dispatch - Where to listen
   * @param {readonly KeySyntax[]} syntax - For key pairs, as for keys()
   * @param {ReadonlyMap<string, AxisEntry>} parsed - The axes, by id, with their sources parsed
   */
  constructor(dispatch, syntax, parsed) {
    this.#dispatch = dispatch
    this.#syntax = syntax
    this.#axes = parsed
    this.#window = windowOf(dispatch.target)
    for (const type of ['keydown', 'keyup', 'mousemove']) {
      dispatch.target.addEventListener(type, this, { capture: dispatch.capture })
    }
    this.#window.addEventListener('blur', this)
  }

  /**
   * Hears keys, the mouse moving, and the window losing focus, which lets go of every key
   * @param {Event} event - A keydown, keyup, mousemove or blur
   * @returns {void}
   */
  handleEvent(event) {
    if (event.type === 'blur') {
      this.#keys.clear()
    } else if (event instanceof MouseEvent) {
      this.#moved = {
        horizontal: this.#moved.horizontal + event.movementX,
        vertical: this.#moved.vertical + event.movementY,
      }
    } else if (event instanceof KeyboardEvent && event.type === 'keyup') {
      this.#keys.delete(keyId(event))
    } else if (event instanceof KeyboardEvent && !inInput(event.target)) {
      this.#keys.set(keyId(event), eventToKeyLookups(event, { prefix: '', suffix: '', syntax: this.#syntax }))
    }
  }

  /**
   * Whether a key is down now
   * @param {ParsedKey} key - The key
   * @returns {number} 1 if it is, 0 if not
   */
  #down(key) {
    const lookup = keyToLookup(key)
    return [...this.#keys.values()].some((lookups) => lookups.includes(lookup)) ? 1 : 0
  }

  /**
   * One source's part of an axis's value
   * @param {ParsedAxis} source - The source
   * @param {Movement} since - The mouse's movement when the axis was last read
   * @returns {AxisValue} Its position or delta, inverted if it is
   */
  #value(source, since) {
    const sign = source.invert ? -1 : 1
    if (source.kind === 'keys') {
      return { delta: 0, position: sign * (this.#down(source.pos) - this.#down(source.neg)) }
    }
    if (source.kind === 'pad') {
      return { delta: 0, position: sign * padAxis(source.source) }
    }
    const delta =
      source.source === 'x' ? this.#moved.horizontal - since.horizontal : this.#moved.vertical - since.vertical
    return { delta: sign * delta, position: 0 }
  }

  /**
   * An axis's value now. Reading it takes the mouse's movement since its last read, applying or not
   * @param {string} id - The axis
   * @returns {AxisValue} Its position, -1 to 1, and the mouse's movement in pixels
   */
  axis(id) {
    const entry = this.#axes.get(id)
    const since = this.#read.get(id) ?? STILL
    this.#read.set(id, this.#moved)
    if (entry === undefined || !isActive(entry.def, this.#dispatch.context()) || anyOverlayOpen()) {
      return ZERO
    }
    return this.#sum(entry.sources, since)
  }

  /**
   * Every source's part of an axis's value, added up, its position kept from -1 to 1
   * @param {readonly ParsedAxis[]} sources - The axis's sources
   * @param {Movement} since - The mouse's movement when the axis was last read
   * @returns {AxisValue} The axis's value
   */
  #sum(sources, since) {
    let delta = 0
    let position = 0
    for (const source of sources) {
      const value = this.#value(source, since)
      delta += value.delta
      position += value.position
    }
    return { delta, position: Math.max(-1, Math.min(1, position)) }
  }

  /** @returns {void} */
  stop() {
    const { capture, target } = this.#dispatch
    for (const type of ['keydown', 'keyup', 'mousemove']) {
      target.removeEventListener(type, this, { capture })
    }
    this.#window.removeEventListener('blur', this)
  }
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
