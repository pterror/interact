/**
 * Showing and recording axis sources, for the settings panel. Recording takes whichever comes first: enough mouse
 * movement along one direction, a stick or trigger pushed well past where it rested, or two keys (toward -1, then
 * toward 1).
 */

/**
 * @import { ParsedAxis } from './axes.js'
 * @import { InputUI } from './input.js'
 * @import { KeySyntax } from './keys.js'
 * @import { Pad } from './pads.js'
 */

import { axes, axisToLookup, parseAxis } from './axes.js'
import { eventToBindingString, formatKeyParts } from './keys-ui.js'
import { keyToLookup } from './keys.js'
import { PAD_AXES, connectedPads, hasPads, padAxesOf } from './pads.js'

/** How far the mouse moves along one direction to be recorded, in pixels */
const MOUSE_DISTANCE = 80

/** How far a stick or trigger moves from where it rested to be recorded */
const PAD_DISTANCE = 0.6

/**
 * How each mouse, stick and trigger source is shown
 * @type {ReadonlyMap<string, string>}
 */
const AXIS_GLYPHS = new Map([
  ['mouse:x', 'Mouse ↔'],
  ['mouse:y', 'Mouse ↕'],
  ['pad:lt', 'LT'],
  ['pad:lx', 'Left stick ↔'],
  ['pad:ly', 'Left stick ↕'],
  ['pad:rt', 'RT'],
  ['pad:rx', 'Right stick ↔'],
  ['pad:ry', 'Right stick ↕'],
])

/**
 * An axis source parsed, if it can be
 * @param {string} binding - The source
 * @returns {ParsedAxis | undefined} It parsed, or undefined if it names none
 */
function readable(binding) {
  try {
    return parseAxis(binding)
  } catch {
    return undefined
  }
}

/**
 * An axis source as display parts ("-mouse:y" is ["Mouse ↕", "Inverted"]); one it can't read is shown as written
 * @param {string} binding - The source
 * @returns {string[]} The parts as shown
 */
function formatAxisParts(binding) {
  const parsed = readable(binding)
  if (parsed === undefined) {
    return [binding]
  }
  const parts =
    parsed.kind === 'keys'
      ? [...formatKeyParts(keyToLookup(parsed.neg)), '/', ...formatKeyParts(keyToLookup(parsed.pos))]
      : [AXIS_GLYPHS.get(axisToLookup(parsed)) ?? binding]
  return parsed.invert ? [...parts, 'Inverted'] : parts
}

/** One recording of an axis source */
class AxesRecorder {
  /**
   * @readonly
   * @type {Window}
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
  #moved = { horizontal: 0, vertical: 0 }
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
   * @param {Window} target - The window recording happens in
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
    const index = now.findIndex((value, at) => Math.abs(value - (rest[at] ?? 0)) > PAD_DISTANCE)
    return index === -1 ? undefined : PAD_AXES[index]
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

/**
 * Axes, shown and recorded as well as read
 * @param {readonly KeySyntax[]} syntax - As for axes()
 * @returns {InputUI} Axes, as an input that can be shown and recorded
 */
function axesUI(...syntax) {
  return {
    ...axes(...syntax),
    format: formatAxisParts,
    invert: true,
    label: 'Axis',
    prompt: () => 'Move the mouse, tilt a stick, or press two keys...',
    record: ({ target }, done) => {
      const recorder = new AxesRecorder(target ?? globalThis.window, syntax, done)
      return () => {
        recorder.stop()
      }
    },
    ui: true,
  }
}

export { AxesRecorder, axesUI, formatAxisParts }
