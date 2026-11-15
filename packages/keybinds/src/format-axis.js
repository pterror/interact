/**
 * An axis binding as people see it: "mouse:x" is ["Mouse ↔"], "-pad:ry" is ["Right stick ↕", "Inverted"],
 * "keys:a/d" is ["A", "/", "D"]. One it can't read shows as written.
 */

import { formatKey } from './format-key.js'
import { withStrings } from './strings.js'

/** @import { StringsOption } from './strings.js' */

/**
 * An axis binding as display parts
 * @param {string} binding - The binding
 * @param {ReadonlyMap<string, string>} [layout] - What each physical key types on the person's layout, as for
 *   formatKey()
 * @param {StringsOption} [strings] - The words to show in place of English
 * @returns {string[]} The parts as shown
 */
function formatAxis(binding, layout, strings) {
  const words = withStrings(strings)
  const written = binding.trim().toLowerCase()
  const invert = written.startsWith('-')
  const source = written.slice(invert ? 1 : 0)
  const keys = source.startsWith('keys:') ? source.slice('keys:'.length).split('/') : []
  const [negative = '', positive = ''] = keys
  const shown = new Map([
    ['mouse:x', words.mouseX],
    ['mouse:y', words.mouseY],
    ['pad:lt', 'LT'],
    ['pad:lx', words.leftStickX],
    ['pad:ly', words.leftStickY],
    ['pad:rt', 'RT'],
    ['pad:rx', words.rightStickX],
    ['pad:ry', words.rightStickY],
  ]).get(source)
  const pair = keys.length === 2 && negative !== '' && positive !== ''
  if (!pair && shown === undefined) {
    return [binding]
  }
  return [
    ...(pair
      ? [...formatKey(negative, layout, words), '/', ...formatKey(positive, layout, words)]
      : [shown ?? binding]),
    ...(invert ? [words.inverted] : []),
  ]
}

export { formatAxis }
