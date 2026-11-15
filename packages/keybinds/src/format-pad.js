/**
 * A gamepad binding as people see it, by its button's standard name whatever name the binding uses: "south" is ["A"].
 * One step, without a suffix: formatSteps() shows the rest.
 */

import { padAliases } from './pad-parse.js'
import { withStrings } from './strings.js'

/** @import { StringsOption } from './strings.js' */

/**
 * A gamepad binding as display parts
 * @param {string} binding - One step of a binding, without a suffix: "rt"
 * @param {StringsOption} [strings] - The words to show in place of English
 * @returns {string[]} The button as shown; one it doesn't know, as written
 */
function formatPad(binding, strings) {
  const words = withStrings(strings)
  const shown = new Map([
    ['a', 'A'],
    ['b', 'B'],
    ['back', words.back],
    ['down', words.dpadDown],
    ['home', words.home],
    ['lb', 'LB'],
    ['left', words.dpadLeft],
    ['ls', 'LS'],
    ['lt', 'LT'],
    ['rb', 'RB'],
    ['right', words.dpadRight],
    ['rs', 'RS'],
    ['rt', 'RT'],
    ['start', words.start],
    ['up', words.dpadUp],
    ['x', 'X'],
    ['y', 'Y'],
  ])
  const name = binding.trim().toLowerCase()
  return [shown.get(padAliases.get(name) ?? name) ?? binding]
}

export { formatPad }
