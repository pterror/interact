/**
 * A whole binding as people see it: each step through a format for one step, "then" between steps, and the suffix
 * last ("Release", "Hold", "Tap"): "g i" is ["G", "then", "I"], "k:up" is ["K", "Release"].
 */

import { splitBinding } from './split-binding.js'
import { withStrings } from './strings.js'

/** @import { StringsOption } from './strings.js' */

/**
 * A binding as display parts
 * @param {string} binding - The binding
 * @param {(step: string) => readonly string[]} format - How one step is shown: formatKey, formatMouse, formatPad
 * @param {StringsOption} [strings] - The words to show in place of English (`andThen`, `hold`, `tap`, `release`)
 * @returns {string[]} The parts as shown
 */
function formatSteps(binding, format, strings) {
  const words = withStrings(strings)
  const { steps, suffix } = splitBinding(binding)
  const shown = new Map([
    [':hold', words.hold],
    [':tap', words.tap],
    [':up', words.release],
  ]).get(suffix)
  return [
    ...steps.flatMap((step, index) => [...(index === 0 ? [] : [words.andThen]), ...format(step)]),
    ...(shown === undefined ? [] : [shown]),
  ]
}

export { formatSteps }
