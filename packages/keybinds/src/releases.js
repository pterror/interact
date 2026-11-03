/**
 * Release bindings: "k:up", "middle:up", "a:up" run when the key or button comes up.
 */

/** @import { Phase } from './core.js' */

import { RELEASE_SUFFIX } from './binding.js'

/**
 * Release bindings, for keybinds({ releases: releases() }). A command whose own press ran always gets its release
 * (a hold can't be left open); other release bindings run as usual until one takes the event.
 * @returns {Phase} The phase that runs release bindings
 */
function releases() {
  return {
    suffixes: [RELEASE_SUFFIX],
    up(run) {
      let consumed = false
      for (const command of run.bound(RELEASE_SUFFIX) ?? []) {
        if (run.press.fired.has(command)) {
          consumed = run.execute(command) || consumed
        } else if (!consumed && run.allowed(command)) {
          consumed = run.execute(command)
        }
      }
      return consumed
    },
  }
}

export { releases }
