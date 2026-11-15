/**
 * A mouse binding as people see it, one part per modifier and the button: "$mod+click" is ["⌘", "Click"] on a Mac.
 * One step, without a suffix: formatSteps() shows the rest.
 */

import { formatModifier } from './modifiers.js'
import { mouseButtons } from './mouse-parse.js'
import { withStrings } from './strings.js'

/** @import { StringsOption } from './strings.js' */

/**
 * A mouse binding as display parts
 * @param {string} binding - One step of a binding, without a suffix: "alt+RightClick"
 * @param {StringsOption} [strings] - The words to show in place of English
 * @returns {string[]} The parts as shown; a part it doesn't know, as written
 */
function formatMouse(binding, strings) {
  const words = withStrings(strings)
  const shown = new Map([
    ['back', words.back],
    ['click', words.click],
    ['forward', words.forward],
    ['middle', words.middle],
    ['right', words.right],
    ['scrolldown', words.scrollDown],
    ['scrollleft', words.scrollLeft],
    ['scrollright', words.scrollRight],
    ['scrollup', words.scrollUp],
  ])
  return binding.split('+').map((part) => {
    const name = part.trim().toLowerCase()
    return formatModifier(name, words) ?? shown.get(mouseButtons.get(name) ?? '') ?? part
  })
}

export { formatMouse }
