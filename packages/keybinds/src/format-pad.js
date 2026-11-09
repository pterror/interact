/**
 * A gamepad binding as people see it, by its button's standard name whatever name the binding uses: "south" is ["A"].
 * One step, without a suffix: formatSteps() shows the rest.
 */

import { padAliases } from './pad-parse.js'

/** @type {ReadonlyMap<string, string>} */
const SHOWN = new Map([
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
 * A gamepad binding as display parts
 * @param {string} binding - One step of a binding, without a suffix: "rt"
 * @returns {string[]} The button as shown; one it doesn't know, as written
 */
function formatPad(binding) {
  const name = binding.trim().toLowerCase()
  return [SHOWN.get(padAliases.get(name) ?? name) ?? binding]
}

export { formatPad }
