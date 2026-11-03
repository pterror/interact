/**
 * Showing and recording axis sources, for the settings panel.
 */

/**
 * @import { ParsedAxis } from './axes.js'
 * @import { InputUI } from './input.js'
 * @import { KeySyntax } from './keys.js'
 */

import { AxesRecorder } from './axes-recorder.js'
import { axes, axisToLookup, parseAxis } from './axes.js'
import { formatKeyParts } from './keys-ui.js'
import { keyToLookup } from './keys.js'

/**
 * How each mouse, stick and trigger source is shown
 * @type {ReadonlyMap<string, string>}
 */
const AXIS_GLYPHS = new Map([
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
 * An axis source parsed, if it can be
 * @param {string} binding - The source
 * @returns {ParsedAxis | undefined} It parsed, or undefined if it names none
 */
function readable(binding) {
  try {
    return parseAxis(binding)
  } catch {
    return undefined
  }
}

/**
 * An axis source as display parts ("-mouse:y" is ["Mouse ↕", "Inverted"]); one it can't read is shown as written
 * @param {string} binding - The source
 * @returns {string[]} The parts as shown
 */
function formatAxisParts(binding) {
  const parsed = readable(binding)
  if (parsed === undefined) {
    return [binding]
  }
  const parts =
    parsed.kind === 'keys'
      ? [...formatKeyParts(keyToLookup(parsed.neg)), '/', ...formatKeyParts(keyToLookup(parsed.pos))]
      : [AXIS_GLYPHS.get(axisToLookup(parsed)) ?? binding]
  return parsed.invert ? [...parts, 'Inverted'] : parts
}

/**
 * Axes, shown and recorded as well as read
 * @param {readonly KeySyntax[]} syntax - As for axes()
 * @returns {InputUI} Axes, as an input that can be shown and recorded
 */
function axesUI(...syntax) {
  return {
    ...axes(...syntax),
    format: formatAxisParts,
    invert: true,
    label: 'Axis',
    prompt: () => 'Move the mouse, tilt a stick, or press two keys...',
    record: ({ target }, done) => {
      const recorder = new AxesRecorder(target ?? globalThis.window, syntax, done)
      return () => {
        recorder.stop()
      }
    },
    ui: true,
  }
}

export { axesUI, formatAxisParts }
