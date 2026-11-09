/**
 * Opening a cheatsheet with a modifier on its own: open while it is held a while, until let go; tapped twice, open until
 * tapped twice again or closed otherwise.
 */

import { modifierHold } from './modifier-hold.js'
import { modifierTaps } from './modifier-taps.js'
import { isMac } from './modifiers.js'

/**
 * @typedef {Readonly<{
 *   open: Readonly<{ get: () => boolean, watch: (listener: () => void) => () => void }>,
 *   to: (open: boolean) => void,
 *   modifier?: string | undefined,
 *   delay?: number | undefined,
 *   target?: EventTarget | undefined,
 * }>} CheatsheetTriggerOptions
 */

/**
 * How long the modifier is held before the cheatsheet opens: long enough that pausing with it down to find the rest
 * of a shortcut doesn't open it **(P)**
 */
const DELAY = 1000

/**
 * Follows the modifier
 * @param {CheatsheetTriggerOptions} options - Whether the cheatsheet is open; setting it; the modifier ("$mod", the
 *   default, is Meta on a Mac and Control elsewhere; or "Control", "Alt", "Shift", "Meta"); how long a hold takes, in
 *   ms (default 1000); and where to listen (default the window)
 * @returns {() => void} Stopping
 */
function cheatsheetTrigger({ delay = DELAY, modifier = '$mod', open, target = globalThis, to }) {
  const modifiers = [modifier.toLowerCase() === '$mod' ? (isMac ? 'Meta' : 'Control') : modifier]
  let pinned = false
  const stops = [
    modifierHold({
      delay,
      modifiers,
      target,
      to(held) {
        if (!pinned) {
          to(held)
        }
      },
    }),
    modifierTaps({
      modifiers,
      run() {
        pinned = !open.get()
        to(pinned)
      },
      target,
    }),
    open.watch(() => {
      if (!open.get()) {
        pinned = false
      }
    }),
  ]
  return () => {
    for (const stop of stops) {
      stop()
    }
  }
}

export { cheatsheetTrigger }
