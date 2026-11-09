/**
 * Tapping a modifier on its own as a trigger: pressed and let go `count` times in quick succession (Shift twice).
 */

import { modifierAlone } from './modifier-alone.js'

/**
 * @typedef {Readonly<{
 *   modifiers: readonly string[],
 *   run: () => void,
 *   count?: number,
 *   within?: number,
 *   target?: EventTarget,
 * }>} ModifierTapsOptions
 */

const DEFAULT_COUNT = 2
const DEFAULT_WITHIN = 400

/**
 * Follows a modifier tapped on its own
 * @param {ModifierTapsOptions} options - The modifiers ("Control", "Alt", "Shift", "Meta"); what runs once they're
 *   tapped; how many taps (default 2); the most ms from one tap's press to the next tap's release (default 400); and
 *   where to listen (default the window)
 * @returns {() => void} Stopping
 * @example
 * const stop = modifierTaps({ modifiers: ['Shift'], run: () => palette.open() })
 */
function modifierTaps({ count = DEFAULT_COUNT, modifiers, run, target = globalThis, within = DEFAULT_WITHIN }) {
  /** @type {readonly number[]} */
  let taps = []
  let pressed = performance.now()
  return modifierAlone({
    down() {
      pressed = performance.now()
    },
    modifiers,
    spoiled() {
      taps = []
    },
    target,
    up(clean) {
      const now = performance.now()
      taps = clean && now - pressed <= within ? [...taps.filter((tap) => now - tap <= within * count), now] : []
      if (taps.length >= count) {
        taps = []
        run()
      }
    },
  })
}

export { modifierTaps }
