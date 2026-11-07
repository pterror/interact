/**
 * Gamepad buttons: bindings like "a", "rt" or "start:up". Gamepad buttons take no modifiers. Showing and recording
 * them is keybinds/gamepad-ui. Listened to for one keybinds(), pads are read every frame while a command has a gamepad
 * binding and a pad is connected: a button changing reports a press starting or ending.
 */

/**
 * @import { ParsedBinding } from './binding.js'
 * @import { CommandInput, Dispatch, InputHandle } from './input.js'
 * @import { Pad } from './pads.js'
 */

import { NO_MODS } from './binding-mods.js'
import { windowOf } from './input.js'
import { anyOverlayOpen } from './modal.js'
import { GAMEPAD_ALIASES, GAMEPAD_BUTTONS, connectedPads, hasPads, pressedButtons } from './pads.js'

/**
 * A gamepad binding's button, by its standard name ("a", "rt"), its alias resolved
 * @param {string} binding - The binding, without its suffix
 * @returns {string} The button's standard name
 * @throws {Error} If no button has that name
 */
function parseGamepad(binding) {
  const name = binding.trim().toLowerCase()
  const button = GAMEPAD_ALIASES.get(name) ?? name
  if (!GAMEPAD_BUTTONS.includes(button)) {
    throw new Error(`Unknown gamepad button "${name}" in binding "${binding}". Valid: ${GAMEPAD_BUTTONS.join(', ')}`)
  }
  return button
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
    // Gamepads have no events of their own for their buttons
    const event = new CustomEvent(down ? 'gamepadbuttondown' : 'gamepadbuttonup', {
      cancelable: true,
      detail: { button: name, gamepad: pad },
    })
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
    if (pads.length > 0) {
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

/**
 * Gamepad buttons. Gamepads have no events for their buttons, so they're read every frame, but only while a command
 * has a gamepad binding and a pad is connected
 * @returns {CommandInput} Gamepad buttons, as an input
 */
function gamepad() {
  return {
    field: 'gamepad',
    /**
     * Starts listening
     * @param {Dispatch} dispatch - Where presses are reported
     * @returns {InputHandle} A function that stops
     */
    listen(dispatch) {
      const listener = new GamepadListener(dispatch)
      return () => {
        listener.stop()
      }
    },
    /**
     * Parses one step of a binding. Gamepad buttons have no modifiers, so a lookup is its own loose lookup
     * @param {string} step - The step
     * @returns {ParsedBinding} The step normalized
     */
    parse(step) {
      const lookup = parseGamepad(step)
      return { lookup, loose: lookup, mods: NO_MODS }
    },
  }
}

export { gamepad, parseGamepad }
