/**
 * A mouse binding as people see it, one part per modifier and the button: "$mod+click" is ["⌘", "Click"] on a Mac.
 * One step, without a suffix: formatSteps() shows the rest.
 */

import { formatModifier } from './modifiers.js'
import { mouseButtons } from './mouse-parse.js'

/** @type {ReadonlyMap<string, string>} */
const SHOWN = new Map([
  ['back', 'Back'],
  ['click', 'Click'],
  ['forward', 'Forward'],
  ['middle', 'Middle'],
  ['right', 'Right'],
  ['scrolldown', 'Scroll ↓'],
  ['scrollleft', 'Scroll ←'],
  ['scrollright', 'Scroll →'],
  ['scrollup', 'Scroll ↑'],
])

/**
 * A mouse binding as display parts
 * @param {string} binding - One step of a binding, without a suffix: "alt+RightClick"
 * @returns {string[]} The parts as shown; a part it doesn't know, as written
 */
function formatMouse(binding) {
  return binding.split('+').map((part) => {
    const name = part.trim().toLowerCase()
    return formatModifier(name) ?? SHOWN.get(mouseButtons.get(name) ?? '') ?? part
  })
}

export { formatMouse }
