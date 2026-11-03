/**
 * Axes, listened to for one keybinds(): the keys held and the mouse's movement, kept so each axis can be read when
 * the app asks. Sticks and triggers are read then too.
 */

/**
 * @import { ParsedAxis } from './axes.js'
 * @import { AxisDef, AxisValue } from './command.js'
 * @import { Dispatch } from './input.js'
 * @import { KeySyntax, ParsedKey } from './keys.js'
 */

import { isActive } from './command.js'
import { inInput, windowOf } from './input.js'
import { eventToKeyLookups, keyId } from './keys-listener.js'
import { keyToLookup } from './keys.js'
import { anyOverlayOpen } from './modal.js'
import { padAxis } from './pads.js'

/**
 * Mouse movement in pixels, along each direction
 * @typedef {Readonly<{ horizontal: number, vertical: number }>} Movement
 */

/** @type {Movement} */
const STILL = { horizontal: 0, vertical: 0 }

/** @type {AxisValue} */
const ZERO = { delta: 0, position: 0 }

const MIN = -1
const MAX = 1
const PUSHED = 1
const AT_REST = 0

/**
 * An axis and its sources, parsed
 * @typedef {Readonly<{ def: AxisDef, sources: readonly ParsedAxis[] }>} AxisEntry
 */

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
    return [...this.#keys.values()].some((lookups) => lookups.includes(lookup)) ? PUSHED : AT_REST
  }

  /**
   * One source's part of an axis's value
   * @param {ParsedAxis} source - The source
   * @param {Movement} since - The mouse's movement when the axis was last read
   * @returns {AxisValue} Its position or delta, inverted if it is
   */
  #value(source, since) {
    const sign = source.invert ? MIN : MAX
    if (source.kind === 'keys') {
      return { delta: AT_REST, position: sign * (this.#down(source.pos) - this.#down(source.neg)) }
    }
    if (source.kind === 'pad') {
      return { delta: AT_REST, position: sign * padAxis(source.source) }
    }
    const delta =
      source.source === 'x' ? this.#moved.horizontal - since.horizontal : this.#moved.vertical - since.vertical
    return { delta: sign * delta, position: AT_REST }
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
    let delta = AT_REST
    let position = AT_REST
    for (const source of sources) {
      const value = this.#value(source, since)
      delta += value.delta
      position += value.position
    }
    return { delta, position: Math.max(MIN, Math.min(MAX, position)) }
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

export { AxesListener }
