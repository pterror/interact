/**
 * Scroll bindings: a command runs once per step of scrolling (a wheel notch, or a trackpad's small deltas adding up
 * to one), the page holds still between steps, and a pause starts a new gesture.
 */

/**
 * @import { Command } from './command.js'
 * @import { Dispatch } from './input.js'
 */

import { eventMods, modsToPrefix } from './binding-mods.js'
import { overlayOpen } from './modal.js'

/**
 * A scroll gesture on one binding: how far it has scrolled since the last step, when it last moved, and whether its
 * commands are taking it (if one returned false, the page scrolls instead)
 * @typedef {{ amount: number, last: number, ours: boolean }} Gesture
 */

const DEFAULT_STEP = 50
const DEFAULT_IDLE = 200
const LINE_HEIGHT = 16
const PAGE_HEIGHT = 800
const NONE = 0

/**
 * Which way a wheel event scrolls, as a binding names it: vertically if it does, otherwise horizontally
 * @param {WheelEvent} event - The event
 * @returns {string | undefined} "scrollup", "scrolldown", "scrollleft" or "scrollright"; undefined if it doesn't
 */
function wheelDirection(event) {
  if (event.deltaY !== NONE) {
    return event.deltaY < NONE ? 'scrollup' : 'scrolldown'
  }
  if (event.deltaX !== NONE) {
    return event.deltaX < NONE ? 'scrollleft' : 'scrollright'
  }
  return undefined
}

/**
 * How far a wheel event scrolls along its main axis, in pixels
 * @param {WheelEvent} event - The event
 * @returns {number} The distance
 */
function wheelDistance(event) {
  const distance = Math.abs(event.deltaY === NONE ? event.deltaX : event.deltaY)
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return distance * LINE_HEIGHT
  }
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return distance * (event.view?.innerHeight ?? PAGE_HEIGHT)
  }
  return distance
}

/** Scroll gestures, one per binding, for one keybinds() */
class WheelGestures {
  /**
   * @readonly
   * @type {Dispatch}
   */
  #dispatch
  /**
   * @readonly
   * @type {Map<string, Gesture>}
   */
  #gestures = new Map()
  /**
   * @readonly
   * @type {number}
   */
  #step
  /**
   * @readonly
   * @type {number}
   */
  #idle

  /**
   * @param {Dispatch} dispatch - Where commands are found and run
   * @param {Readonly<{ idle?: number, step?: number }>} options - Pixels per step, and the pause that ends a gesture
   */
  constructor(dispatch, { idle = DEFAULT_IDLE, step = DEFAULT_STEP }) {
    this.#dispatch = dispatch
    this.#step = step
    this.#idle = idle
  }

  /**
   * The commands a scroll would run, the ones that apply now
   * @param {WheelEvent} event - The scroll
   * @returns {Readonly<{ active: readonly Command[], lookup: string }> | undefined} Them, and the gesture's binding
   */
  #bound(event) {
    const direction = wheelDirection(event)
    if (direction === undefined || overlayOpen(event.target)) {
      return undefined
    }
    const mods = eventMods(event)
    const lookup = `${modsToPrefix(mods)}${direction}`
    const active = (this.#dispatch.candidates([lookup], [direction], mods) ?? []).filter((command) =>
      this.#dispatch.isActive(command),
    )
    return active.length === NONE ? undefined : { active, lookup }
  }

  /**
   * The gesture a scroll belongs to: the one going on, or a new one after a pause
   * @param {string} lookup - The scroll's binding
   * @returns {Gesture} The gesture, moved now
   */
  #gesture(lookup) {
    const now = performance.now()
    const going = this.#gestures.get(lookup)
    const gesture =
      going === undefined || now - going.last > this.#idle ? { amount: NONE, last: now, ours: true } : going
    gesture.last = now
    this.#gestures.set(lookup, gesture)
    return gesture
  }

  /**
   * The wheel moved: a step runs the first command that takes it, one step per event so a fast flick doesn't queue
   * up a burst. Between steps the gesture is still the commands', so the page mustn't scroll or zoom meanwhile
   * @param {WheelEvent} event - The scroll
   * @returns {void}
   */
  scrolled(event) {
    const bound = this.#bound(event)
    const gesture = bound === undefined ? undefined : this.#gesture(bound.lookup)
    if (bound === undefined || gesture?.ours !== true) {
      return
    }
    event.preventDefault()
    const { amount, due } = this.#advanced(gesture.amount + wheelDistance(event))
    gesture.amount = amount
    if (due) {
      gesture.ours = bound.active.some((command) => this.#dispatch.execute(command, event))
    }
  }

  /**
   * How far a gesture has scrolled toward its next step, a step taken off once it has scrolled that far
   * @param {number} scrolled - How far it has scrolled since its last step, this scroll included
   * @returns {Readonly<{ amount: number, due: boolean }>} What's left toward the next step, and whether a step is due
   */
  #advanced(scrolled) {
    if (scrolled < this.#step) {
      return { amount: scrolled, due: false }
    }
    return { amount: Math.min(scrolled - this.#step, this.#step), due: true }
  }

  /** @returns {void} */
  clear() {
    this.#gestures.clear()
  }
}

export { WheelGestures, wheelDirection }
