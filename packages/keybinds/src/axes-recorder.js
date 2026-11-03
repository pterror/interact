/**
 * Recording an axis source from whichever comes first: enough mouse movement along one direction, a stick or
 * trigger pushed well past where it rested, or two keys (toward -1, then toward 1).
 */

/**
 * @import { KeySyntax } from './keys.js'
 * @import { Pad } from './pads.js'
 */

import { eventToBindingString } from './keys-ui.js'
import { PAD_AXES, connectedPads, hasPads, padAxesOf } from './pads.js'

/** How far the mouse moves along one direction to be recorded, in pixels */
const MOUSE_DISTANCE = 80

/** How far a stick or trigger moves from where it rested to be recorded */
const PAD_DISTANCE = 0.6

const NOTHING = 0
const NOT_FOUND = -1

/** One recording of an axis source */
class AxesRecorder {
  /**
   * @readonly
   * @type {EventTarget}
   */
  #target
  /**
   * @readonly
   * @type {readonly KeySyntax[]}
   */
  #syntax
  /**
   * @readonly
   * @type {(binding: string) => void}
   */
  #done
  /**
   * How far the mouse has moved along each direction
   * @type {Readonly<{ horizontal: number, vertical: number }>}
   */
  #moved = { horizontal: NOTHING, vertical: NOTHING }
  /**
   * The first of two keys, once pressed
   * @type {string | undefined}
   */
  #firstKey
  /**
   * Each pad's sticks and triggers where they rested, by the pad's index
   * @readonly
   * @type {Map<number, readonly number[]>}
   */
  #rest = new Map()
  /** @type {number | undefined} */
  #frame

  /**
   * Starts listening and reading pads
   * @param {EventTarget} target - The window recording happens in
   * @param {readonly KeySyntax[]} syntax - For key pairs, as for keys()
   * @param {(binding: string) => void} done - Gets the source
   */
  constructor(target, syntax, done) {
    this.#target = target
    this.#syntax = syntax
    this.#done = done
    target.addEventListener('mousemove', this, true)
    target.addEventListener('keydown', this, true)
    if (hasPads()) {
      this.#next()
    }
  }

  /**
   * Hears the mouse moving and keys
   * @param {Event} event - A mousemove or keydown
   * @returns {void}
   */
  handleEvent(event) {
    if (event instanceof MouseEvent) {
      this.#mouse(event)
    } else if (event instanceof KeyboardEvent) {
      this.#key(event)
    }
  }

  /**
   * The mouse moved: recorded once it has gone far enough one way
   * @param {MouseEvent} event - The mousemove
   * @returns {void}
   */
  #mouse(event) {
    const moved = {
      horizontal: this.#moved.horizontal + Math.abs(event.movementX),
      vertical: this.#moved.vertical + Math.abs(event.movementY),
    }
    this.#moved = moved
    if (Math.max(moved.horizontal, moved.vertical) > MOUSE_DISTANCE) {
      this.#done(moved.horizontal >= moved.vertical ? 'mouse:x' : 'mouse:y')
    }
  }

  /**
   * A key went down: the first of the pair, or the second, which records them
   * @param {KeyboardEvent} event - The keydown
   * @returns {void}
   */
  #key(event) {
    const binding = event.key === 'Escape' || event.repeat ? undefined : eventToBindingString(event, this.#syntax)
    if (binding === undefined) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    const key = binding.slice(binding.lastIndexOf('+') + '+'.length)
    if (this.#firstKey === undefined) {
      this.#firstKey = key
    } else if (key !== this.#firstKey) {
      this.#done(`keys:${this.#firstKey}/${key}`)
    }
  }

  /** @returns {void} */
  #next() {
    this.#frame = requestAnimationFrame(() => {
      this.#read()
    })
  }

  /**
   * Reads every pad once: a stick or trigger that moved far enough from where it rested is recorded, and otherwise
   * reading goes on
   * @returns {void}
   */
  #read() {
    this.#frame = undefined
    for (const pad of connectedPads()) {
      const moved = this.#padMoved(pad)
      if (moved !== undefined) {
        this.#done(`pad:${moved}`)
        return
      }
    }
    this.#next()
  }

  /**
   * Which of a pad's sticks and triggers moved far enough from where it rested; the first reading is where it rests
   * @param {Pad} pad - The pad
   * @returns {string | undefined} The stick or trigger, if one did
   */
  #padMoved(pad) {
    const now = padAxesOf(pad)
    const rest = this.#rest.get(pad.index)
    if (rest === undefined) {
      this.#rest.set(pad.index, now)
      return undefined
    }
    const index = now.findIndex((value, at) => Math.abs(value - (rest[at] ?? NOTHING)) > PAD_DISTANCE)
    return index === NOT_FOUND ? undefined : PAD_AXES[index]
  }

  /** @returns {void} */
  stop() {
    this.#target.removeEventListener('mousemove', this, true)
    this.#target.removeEventListener('keydown', this, true)
    if (this.#frame !== undefined) {
      cancelAnimationFrame(this.#frame)
    }
    this.#frame = undefined
  }
}

export { AxesRecorder }
