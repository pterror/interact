/**
 * A whole binding as people see it: each step through a format for one step, "then" between steps, and the suffix
 * last ("Release", "Hold", "Tap"): "g i" is ["G", "then", "I"], "k:up" is ["K", "Release"].
 */

import { splitBinding } from './split-binding.js'

/** @type {ReadonlyMap<string, string>} */
const SUFFIXES = new Map([
  [':hold', 'Hold'],
  [':tap', 'Tap'],
  [':up', 'Release'],
])

/**
 * A binding as display parts
 * @param {string} binding - The binding
 * @param {(step: string) => readonly string[]} format - How one step is shown: formatKey, formatMouse, formatPad
 * @returns {string[]} The parts as shown
 */
function formatSteps(binding, format) {
  const { steps, suffix } = splitBinding(binding)
  const shown = SUFFIXES.get(suffix)
  return [
    ...steps.flatMap((step, index) => [...(index === 0 ? [] : ['then']), ...format(step)]),
    ...(shown === undefined ? [] : [shown]),
  ]
}

export { formatSteps }
