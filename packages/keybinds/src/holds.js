/**
 * Holding and tapping ("k:hold", "k:tap"): hold handlers run once a press has lasted a while, tap handlers when it
 * comes up before that. Together they give one key two jobs. The press itself goes on to its own handlers as usual.
 */

import { runFirst } from './run-first.js'

/**
 * @typedef {Readonly<{ run: (event: Event) => boolean | void, when?: () => boolean, typing?: boolean }>} Handler
 */

/**
 * @template Q
 * @typedef {Readonly<{ id: string, query: Q, event: Event, typing: boolean, repeat: boolean }>} Press
 */

/**
 * @typedef {Readonly<{ id: string, event: Event, typing: boolean, blocked: boolean }>} Release
 */

/**
 * @template Q, H
 * @typedef {Readonly<{ down: (press: Press<Q>) => H | undefined, up: (release: Release) => void }>} Sink
 */

/**
 * @template T
 * @typedef {Readonly<{ has: (value: T) => boolean, watch: (listener: (values?: readonly T[]) => void) => () => void }>}
 *   Test
 */

/**
 * @template Q, H
 * @typedef {Readonly<{ hold: (query: Q) => readonly H[], tap: (query: Q) => readonly H[], delay?: number,
 *   to: Sink<Q, H> }>} HoldsOptions
 */

/**
 * What holds() gives: where presses go; `held` holds for a hold handler while the press it took is down, `took` is
 * the hold handler a press that is down took, and `stop` drops the presses being timed
 * @template Q, H
 * @typedef {Sink<Q, H> & Readonly<{ held: Test<H>, took: (id: string) => readonly H[], stop: () => void }>} Holds
 */

/**
 * A press being timed, and when it went down
 * @template Q
 * @typedef {Readonly<{ press: Press<Q>, at: number, timer: ReturnType<typeof setTimeout> }>} Timed
 */

const DEFAULT_DELAY = 500

/**
 * Times presses for their hold and tap handlers
 * @template Q
 * @template {Handler} H
 * @param {HoldsOptions<Q, H>} options - The hold and tap handlers bound to a press, best first; how long a press
 *   lasts before it is a hold, in ms (default 500); and where presses go on to
 * @returns {Holds<Q, H>} Where presses go, and what is held
 */
function holds({ delay = DEFAULT_DELAY, hold, tap, to }) {
  /** @type {Map<string, Timed<Q>>} */
  const timed = new Map()
  /** @type {Map<string, H>} */
  const holding = new Map()
  /** @type {Set<(values?: readonly H[]) => void>} */
  const listeners = new Set()

  /**
   * Tells listeners a hold handler changed
   * @param {H | undefined} handler - The handler
   * @returns {void}
   */
  const tell = (handler) => {
    if (handler !== undefined) {
      for (const listener of listeners) {
        listener([handler])
      }
    }
  }

  /**
   * Ends a press's timing
   * @param {string} id - The press
   * @returns {void}
   */
  const end = (id) => {
    const ended = timed.get(id)
    if (ended !== undefined) {
      clearTimeout(ended.timer)
      timed.delete(id)
      tell(holding.get(id))
      holding.delete(id)
    }
  }

  return {
    down(press) {
      if (!press.repeat || !timed.has(press.id)) {
        end(press.id)
        const timer = setTimeout(() => {
          const took = runFirst(hold(press.query), press.event, press.typing)
          if (took !== undefined) {
            holding.set(press.id, took)
            tell(took)
          }
        }, delay)
        timed.set(press.id, { at: performance.now(), press, timer })
      }
      return to.down(press)
    },
    held: {
      has: (handler) => [...holding.values()].includes(handler),
      watch(listener) {
        listeners.add(listener)
        return () => {
          listeners.delete(listener)
        }
      },
    },
    stop() {
      for (const id of timed.keys()) {
        end(id)
      }
    },
    took(id) {
      const took = holding.get(id)
      return took === undefined ? [] : [took]
    },
    up(release) {
      const entry = timed.get(release.id)
      end(release.id)
      if (entry !== undefined && performance.now() - entry.at < delay && !release.blocked) {
        runFirst(tap(entry.press.query), release.event, release.typing)
      }
      to.up(release)
    },
  }
}

export { holds }
