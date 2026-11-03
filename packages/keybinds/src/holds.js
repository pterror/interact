/**
 * Holding and tapping: "k:hold" runs once a key or button has been held for a while, "k:tap" when it comes up before
 * that. Together they give one key two jobs.
 */

/**
 * @import { Phase } from './core.js'
 * @import { Press } from './input.js'
 */

const DEFAULT_DELAY = 500

/**
 * For keybinds({ holds: holds() })
 * @param {Readonly<{ delay?: number }>} [options] - How long a press is held before it's a hold, in ms (default 500)
 * @returns {Phase} The phase that runs hold and tap bindings
 */
function holds({ delay = DEFAULT_DELAY } = {}) {
  /** @type {WeakMap<Press, ReturnType<typeof setTimeout>>} */
  const timers = new WeakMap()
  return {
    down(run) {
      if (run.bound(':hold') === undefined) {
        return
      }
      const timer = setTimeout(() => {
        const found = run.held() ? run.bound(':hold') : undefined
        if (found !== undefined) {
          run.fire(found)
        }
      }, delay)
      timers.set(run.press, timer)
    },
    suffixes: [':hold', ':tap'],
    up(run) {
      clearTimeout(timers.get(run.press))
      if (performance.now() - run.press.at >= delay) {
        return false
      }
      const found = run.bound(':tap')
      return found !== undefined && run.fire(found)
    },
  }
}

export { holds }
