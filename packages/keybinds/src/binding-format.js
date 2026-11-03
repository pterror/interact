/**
 * Bindings as people see them: each step through its input's format, "then" between steps, and a last part for a
 * suffix ("Release", "Hold", "Tap").
 */

/**
 * @import { Command } from './command.js'
 * @import { InputUI } from './input.js'
 */

import { splitBinding, splitRelease } from './binding.js'
import { bindingsOf } from './command.js'

/** @type {ReadonlyMap<string, string>} */
const SUFFIX_LABELS = new Map([
  [':hold', 'Hold'],
  [':tap', 'Tap'],
  [':up', 'Release'],
])

/**
 * A binding's parts, with a last "Release" part for ":up" bindings
 * @param {string} binding - The binding
 * @param {(part: string) => string} formatPart - How one part is shown
 * @returns {string[]} The parts as shown
 */
function formatWithRelease(binding, formatPart) {
  const { release } = splitRelease(binding.toLowerCase())
  const source = release ? binding.trim().replace(/:up$/iu, '') : binding
  const parts = source.split('+').map((part) => formatPart(part))
  return release ? [...parts, 'Release'] : parts
}

/**
 * A binding as display parts
 * @param {InputUI} input - Whose binding it is
 * @param {string} binding - The binding
 * @returns {string[]} Each step's parts, "then" between steps, and the suffix's label last
 */
function formatBinding(input, binding) {
  if (input.axis === true) {
    return input.format(binding)
  }
  const { steps, suffix } = splitBinding(binding)
  const [first, ...rest] = steps
  const label = SUFFIX_LABELS.get(suffix)
  return [
    ...(first === undefined ? [] : input.format(first)),
    ...rest.flatMap((step) => [['then'], input.format(step)].flat()),
    ...(label === undefined ? [] : [label]),
  ]
}

/**
 * A command's bindings through each input, as display parts, in the order of `inputs`
 * @param {Command} command - The command
 * @param {readonly InputUI[]} inputs - How each kind of binding is shown
 * @returns {string[][]} One list of parts per binding
 */
function bindingParts(command, inputs) {
  return inputs.flatMap((input) =>
    input.axis === true ? [] : bindingsOf(command, input.field).map((binding) => formatBinding(input, binding)),
  )
}

export { bindingParts, formatBinding, formatWithRelease }
