/**
 * Showing and recording gamepad bindings, for the settings panel, cheatsheet, palette and menus.
 */

/** @import { InputUI } from './input.js' */

import { formatWithRelease } from './binding-format.js'
import { GamepadRecorder } from './gamepad-recorder.js'
import { gamepad } from './gamepad.js'
import { GAMEPAD_ALIASES, connectedPads } from './pads.js'

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

const NONE = 0

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

/**
 * Gamepad buttons, shown and recorded as well as listened to. Recording is offered while a pad is connected
 * @returns {InputUI} Gamepad buttons, as an input that can be shown and recorded
 */
function gamepadUI() {
  return {
    ...gamepad(),
    available: () => connectedPads().length > NONE,
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
    watch: watchPads,
  }
}

export { formatGamepadParts, gamepadUI }
