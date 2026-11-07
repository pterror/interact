/**
 * Showing and recording gamepad bindings, for the settings panel, cheatsheet, palette and menus. Recording takes the
 * next button pressed, or with `release` pressed and let go. Every pad is read each frame; buttons already down when
 * recording starts don't count until they've been let go.
 */

/**
 * @import { InputUI } from './input.js'
 * @import { Pad } from './pads.js'
 */

import { formatWithRelease } from './binding-format.js'
import { RELEASE_SUFFIX } from './binding.js'
import { gamepad } from './gamepad.js'
import { GAMEPAD_ALIASES, GAMEPAD_BUTTONS, connectedPads, hasPads, pressedButtons } from './pads.js'

/**
 * How each button is shown, by its standard name
 * @type {ReadonlyMap<string, string>}
 */
const GAMEPAD_GLYPHS = new Map([
  ['a', 'A'],
  ['b', 'B'],
  ['back', 'Back'],
  ['down', 'D-pad ↓'],
  ['home', 'Home'],
  ['lb', 'LB'],
  ['left', 'D-pad ←'],
  ['ls', 'LS'],
  ['lt', 'LT'],
  ['rb', 'RB'],
  ['right', 'D-pad →'],
  ['rs', 'RS'],
  ['rt', 'RT'],
  ['start', 'Start'],
  ['up', 'D-pad ↑'],
  ['x', 'X'],
  ['y', 'Y'],
])

/**
 * One gamepad button as shown
 * @param {string} part - The button, by any of its names
 * @returns {string} How it's shown
 */
function formatGamepadPart(part) {
  const name = part.trim().toLowerCase()
  return GAMEPAD_GLYPHS.get(GAMEPAD_ALIASES.get(name) ?? name) ?? part
}

/**
 * A gamepad binding as display parts ("rt:up" is ["RT", "Release"])
 * @param {string} binding - The binding
 * @returns {string[]} The parts as shown
 */
function formatGamepadParts(binding) {
  return formatWithRelease(binding, formatGamepadPart)
}

/**
 * Follows pads connecting and disconnecting
 * @param {() => void} onChange - Called on each
 * @returns {() => void} A function that stops
 */
function watchPads(onChange) {
  globalThis.addEventListener('gamepadconnected', onChange)
  globalThis.addEventListener('gamepaddisconnected', onChange)
  return () => {
    globalThis.removeEventListener('gamepadconnected', onChange)
    globalThis.removeEventListener('gamepaddisconnected', onChange)
  }
}

/** One recording of a gamepad binding */
class GamepadRecorder {
  /**
   * @readonly
   * @type {boolean}
   */
  #release
  /**
   * @readonly
   * @type {(binding: string) => void}
   */
  #done
  /**
   * Each pad's buttons as last read, by the pad's index
   * @readonly
   * @type {Map<number, readonly boolean[]>}
   */
  #before = new Map()
  /**
   * The button pressed, by pad and index, while waiting for it to be let go
   * @type {string | undefined}
   */
  #held
  /** @type {number | undefined} */
  #frame

  /**
   * Starts reading pads
   * @param {boolean} release - Whether to record a release
   * @param {(binding: string) => void} done - Gets the binding
   */
  constructor(release, done) {
    this.#release = release
    this.#done = done
    if (hasPads()) {
      this.#next()
    }
  }

  /** @returns {void} */
  #next() {
    this.#frame = requestAnimationFrame(() => {
      this.#read()
    })
  }

  /**
   * Reads every pad once: a binding ends the recording, and otherwise reading goes on
   * @returns {void}
   */
  #read() {
    this.#frame = undefined
    for (const pad of connectedPads()) {
      const binding = this.#recorded(pad)
      if (binding !== undefined) {
        this.#done(binding)
        return
      }
    }
    this.#next()
  }

  /**
   * What a pad's buttons record since it was last read
   * @param {Pad} pad - The pad
   * @returns {string | undefined} The binding, once there is one
   */
  #recorded(pad) {
    const now = pressedButtons(pad)
    const was = this.#before.get(pad.index)
    this.#before.set(pad.index, now)
    for (const [index, down] of was === undefined ? [] : now.entries()) {
      const wentDown = down === (was?.[index] === true) ? undefined : down
      const binding = this.#changed(`${pad.index}:${index}`, GAMEPAD_BUTTONS[index] ?? '', wentDown)
      if (binding !== undefined) {
        return binding
      }
    }
    return undefined
  }

  /**
   * A button changing: going down records it at once, or holds it when recording a release; the held button going
   * up records its release
   * @param {string} id - The button, by pad and index
   * @param {string} name - Its name
   * @param {boolean | undefined} wentDown - Whether it went down or up, undefined if neither
   * @returns {string | undefined} The binding, if this records one
   */
  #changed(id, name, wentDown) {
    if (wentDown === true && !this.#release) {
      return name
    }
    if (wentDown === true) {
      this.#held = id
    } else if (wentDown === false && this.#held === id) {
      return `${name}${RELEASE_SUFFIX}`
    }
    return undefined
  }

  /** @returns {void} */
  stop() {
    if (this.#frame !== undefined) {
      cancelAnimationFrame(this.#frame)
    }
    this.#frame = undefined
  }
}

/**
 * Gamepad buttons, shown and recorded as well as listened to. Recording is offered while a pad is connected
 * @returns {InputUI} Gamepad buttons, as an input that can be shown and recorded
 */
function gamepadUI() {
  return {
    ...gamepad(),
    available: () => connectedPads().length > 0,
    format: formatGamepadParts,
    label: 'Gamepad',
    prompt: (release) => (release ? 'Press and release a gamepad button...' : 'Press a gamepad button...'),
    record: ({ release }, done) => {
      const recorder = new GamepadRecorder(release, done)
      return () => {
        recorder.stop()
      }
    },
    release: () => true,
    ui: true,
    watch: watchPads,
  }
}

export { GamepadRecorder, formatGamepadParts, gamepadUI }
