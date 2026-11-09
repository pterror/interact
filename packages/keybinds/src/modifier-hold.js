/**
 * Holding a modifier on its own as a trigger: true once it has been held `delay` ms, false when let go (a cheatsheet
 * shown while Control is held).
 */

import { modifierAlone } from './modifier-alone.js'

/**
 * @typedef {Readonly<{
 *   modifiers: readonly string[],
 *   to: (held: boolean) => void,
 *   delay?: number,
 *   target?: EventTarget,
 * }>} ModifierHoldOptions
 */

const DEFAULT_DELAY = 200

/**
 * Follows a modifier held on its own
 * @param {ModifierHoldOptions} options - The modifiers ("Control", "Alt", "Shift", "Meta"); what hears it held and let
 *   go; how long a hold takes, in ms (default 200); and where to listen (default the window)
 * @returns {() => void} Stopping
 * @example
 * const stop = modifierHold({ modifiers: ['Control'], to: (held) => cheatsheet.set(held) })
 */
function modifierHold({ delay = DEFAULT_DELAY, modifiers, target = globalThis, to }) {
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer = undefined
  let held = false

  const letGo = () => {
    clearTimeout(timer)
    timer = undefined
    if (held) {
      held = false
      to(false)
    }
  }

  const stop = modifierAlone({
    down() {
      letGo()
      timer = setTimeout(() => {
        timer = undefined
        held = true
        to(true)
      }, delay)
    },
    modifiers,
    spoiled: letGo,
    target,
    up: letGo,
  })
  return () => {
    stop()
    clearTimeout(timer)
  }
}

export { modifierHold }
