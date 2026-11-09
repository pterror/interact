/**
 * An axis binding as people see it: "mouse:x" is ["Mouse ↔"], "-pad:ry" is ["Right stick ↕", "Inverted"],
 * "keys:a/d" is ["A", "/", "D"]. One it can't read shows as written.
 */

import { formatKey } from './format-key.js'

/** @type {ReadonlyMap<string, string>} */
const SHOWN = new Map([
  ['mouse:x', 'Mouse ↔'],
  ['mouse:y', 'Mouse ↕'],
  ['pad:lt', 'LT'],
  ['pad:lx', 'Left stick ↔'],
  ['pad:ly', 'Left stick ↕'],
  ['pad:rt', 'RT'],
  ['pad:rx', 'Right stick ↔'],
  ['pad:ry', 'Right stick ↕'],
])

/**
 * An axis binding as display parts
 * @param {string} binding - The binding
 * @param {ReadonlyMap<string, string>} [layout] - What each physical key types on the person's layout, as for
 *   formatKey()
 * @returns {string[]} The parts as shown
 */
function formatAxis(binding, layout) {
  const written = binding.trim().toLowerCase()
  const invert = written.startsWith('-')
  const source = written.slice(invert ? 1 : 0)
  const keys = source.startsWith('keys:') ? source.slice('keys:'.length).split('/') : []
  const [negative = '', positive = ''] = keys
  const shown = SHOWN.get(source)
  const pair = keys.length === 2 && negative !== '' && positive !== ''
  if (!pair && shown === undefined) {
    return [binding]
  }
  return [
    ...(pair ? [...formatKey(negative, layout), '/', ...formatKey(positive, layout)] : [shown ?? binding]),
    ...(invert ? ['Inverted'] : []),
  ]
}

export { formatAxis }
