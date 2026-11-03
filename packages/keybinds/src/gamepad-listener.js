/**
 * Gamepad buttons, read every frame for one keybinds() while a command has a gamepad binding and a pad is connected:
 * a button changing reports a press starting or ending.
 */

/**
 * @import { Dispatch } from './input.js'
 * @import { Pad } from './pads.js'
 */

import { NO_MODS } from './binding-mods.js'
import { windowOf } from './input.js'
import { anyOverlayOpen } from './modal.js'
import { GAMEPAD_BUTTONS, connectedPads, hasPads, pressedButtons } from './pads.js'

const NONE = 0

/**
 * The event a button changing is reported with, since gamepads have none of their own
 * @param {number} pad - The pad's index
 * @param {string} button - The button's name
 * @param {boolean} down - Whether it went down
 * @returns {CustomEvent<Readonly<{ button: string, gamepad: number }>>} The event
 */
function buttonEvent(pad, button, down) {
  return new CustomEvent(down ? 'gamepadbuttondown' : 'gamepadbuttonup', {
    cancelable: true,
    detail: { button, gamepad: pad },
  })
}

/** Gamepad buttons, read every frame for one keybinds() */
class GamepadListener {
  /**
   * @readonly
   * @type {Dispatch}
   */
  #dispatch
  /**
   * Each pad's buttons as last seen, by the pad's index
   * @readonly
   * @type {Map<number, readonly boolean[]>}
   */
  #seen = new Map()
  /**
   * @readonly
   * @type {EventTarget}
   */
  #window
  /**
   * @readonly
   * @type {boolean}
   */
  #polls
  /** @type {number | undefined} */
  #frame

  /**
   * Starts reading pads, if anything binds a button and the browser has gamepads
   * @param {Dispatch} dispatch - Where presses are reported
   */
  constructor(dispatch) {
    this.#dispatch = dispatch
    this.#window = windowOf(dispatch.target)
    this.#polls = dispatch.bound && hasPads()
    if (this.#polls) {
      this.#window.addEventListener('gamepadconnected', this)
      this.handleEvent()
    }
  }

  /**
   * A pad connected, or polling starts: read pads from the next frame on
   * @returns {void}
   */
  handleEvent() {
    this.#frame ??= requestAnimationFrame(() => {
      this.#poll()
    })
  }

  /**
   * A button changed
   * @param {number} pad - The pad's index
   * @param {number} index - The button's index
   * @param {boolean} down - Whether it went down
   * @returns {void}
   */
  #changed(pad, index, down) {
    const name = GAMEPAD_BUTTONS[index] ?? ''
    const id = `${pad}:${index}`
    const event = buttonEvent(pad, name, down)
    if (down) {
      this.#dispatch.down(id, event, {
        blocked: anyOverlayOpen(),
        lookups: (suffix) => [[`${name}${suffix}`], [`${name}${suffix}`]],
        mods: NO_MODS,
      })
    } else {
      this.#dispatch.up(id, event, { blocked: anyOverlayOpen() })
    }
  }

  /**
   * Reads every pad once. Buttons already down when a pad is first seen are where it starts, not presses; a pad that
   * went away lets go of everything it held. Reading goes on while any pad is connected
   * @returns {void}
   */
  #poll() {
    this.#frame = undefined
    const pads = connectedPads()
    for (const pad of pads) {
      this.#read(pad)
    }
    for (const [index, buttons] of this.#seen) {
      if (!pads.some((pad) => pad.index === index)) {
        this.#seen.delete(index)
        this.#compare(index, buttons, [])
      }
    }
    if (pads.length > NONE) {
      this.handleEvent()
    }
  }

  /**
   * Reads one pad, reporting what changed since it was last seen
   * @param {Pad} pad - The pad
   * @returns {void}
   */
  #read(pad) {
    const now = pressedButtons(pad)
    const before = this.#seen.get(pad.index)
    this.#seen.set(pad.index, now)
    this.#compare(pad.index, before ?? now, now)
  }

  /**
   * Reports each button that changed between two readings of a pad
   * @param {number} pad - The pad's index
   * @param {readonly boolean[]} before - Its buttons last time
   * @param {readonly boolean[]} now - Its buttons now; a button missing is up
   * @returns {void}
   */
  #compare(pad, before, now) {
    for (const [index, was] of before.entries()) {
      const down = now[index] === true
      if (down !== was) {
        this.#changed(pad, index, down)
      }
    }
  }

  /** @returns {void} */
  stop() {
    if (this.#frame !== undefined) {
      cancelAnimationFrame(this.#frame)
    }
    this.#frame = undefined
    if (this.#polls) {
      this.#window.removeEventListener('gamepadconnected', this)
    }
    this.#seen.clear()
  }
}

export { GamepadListener }
