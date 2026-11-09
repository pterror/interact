/**
 * A whole binding's normal form through one input, whatever syntax it uses: equal for two bindings that trigger the
 * same way ("Ctrl+K:UP" and "ctrl+k:up"). Each step goes through the input's parser with the binding's suffix.
 */

import { splitBinding } from './split-binding.js'

/**
 * A binding's normal form
 * @param {(step: string, suffix: string) => Readonly<{ lookup: string }>} parse - One step through the input's
 *   parser: keyParse (with its syntax), mouseParse, padParse
 * @returns {(binding: string) => string} The binding's steps' lookups, then its suffix
 * @throws {Error} From the function it returns, if the binding doesn't parse
 */
function bindingLookup(parse) {
  return (binding) => {
    const { steps, suffix } = splitBinding(binding)
    if (steps.length === 0) {
      throw new Error(`Invalid binding: "${binding}" has no steps`)
    }
    return `${steps.map((step) => parse(step, suffix).lookup).join(' ')}${suffix}`
  }
}

export { bindingLookup }
