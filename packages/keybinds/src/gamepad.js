/**
 * Gamepad buttons: bindings like "a", "rt" or "start:up". Gamepad buttons take no modifiers. Showing and recording
 * them is keybinds/gamepad-ui.
 */

/**
 * @import { ParsedBinding } from './binding.js'
 * @import { CommandInput, Dispatch, InputHandle } from './input.js'
 */

import { NO_MODS } from './binding-mods.js'
import { GamepadListener } from './gamepad-listener.js'
import { GAMEPAD_ALIASES, GAMEPAD_BUTTONS } from './pads.js'

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
