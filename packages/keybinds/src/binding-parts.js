/**
 * Every binding of an id as people see it, one list of display parts per binding: keys, then mouse, gamepad and axis
 * bindings, each through its format.
 */

import { formatAxis } from './format-axis.js'
import { formatKey } from './format-key.js'
import { formatMouse } from './format-mouse.js'
import { formatPad } from './format-pad.js'
import { formatSteps } from './format-steps.js'

/** @import { StringsOption } from './strings.js' */

/**
 * @typedef {Readonly<{ keys?: readonly string[], mouse?: readonly string[], pad?: readonly string[],
 *   axes?: readonly string[] }>} Entry
 */

/**
 * The bindings as display parts
 * @param {Entry} entry - An id's bindings
 * @param {ReadonlyMap<string, string>} [layout] - What each physical key types on the person's layout (layout()'s
 *   value)
 * @param {StringsOption} [strings] - The words to show in place of English
 * @returns {readonly (readonly string[])[]} Each binding's parts
 */
function bindingParts(entry, layout, strings) {
  return [
    ...(entry.keys ?? []).map((binding) => formatSteps(binding, (step) => formatKey(step, layout, strings), strings)),
    ...(entry.mouse ?? []).map((binding) => formatSteps(binding, (step) => formatMouse(step, strings), strings)),
    ...(entry.pad ?? []).map((binding) => formatSteps(binding, (step) => formatPad(step, strings), strings)),
    ...(entry.axes ?? []).map((binding) => formatAxis(binding, layout, strings)),
  ]
}

export { bindingParts }
