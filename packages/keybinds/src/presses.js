/**
 * Presses running what they are bound to: a press runs the first handler bound to it that applies, which takes its
 * event; its auto-repeat runs again, as the press it repeats; it ends when it comes up.
 */

import { runFirst } from './run-first.js'

/**
 * @typedef {Readonly<{ run: (event: Event) => boolean | void, when?: () => boolean, typing?: boolean }>} Handler
 */

/**
 * A press going down, or repeating: the id it is known by until it comes up, what it is looked up by, its event, and
 * whether it happened where text is typed
 * @template Q
 * @typedef {Readonly<{ id: string, query: Q, event: Event, typing: boolean, repeat: boolean }>} Press
 */

/**
 * Whether something holds, and hearing those it changed for (none: any)
 * @template T
 * @typedef {Readonly<{ has: (value: T) => boolean, watch: (listener: (values?: readonly T[]) => void) => () => void }>}
 *   Test
 */

/**
 * @template Q, H
 * @typedef {Readonly<{
 *   down: (press: Press<Q>) => H | undefined,
 *   up: (release: Readonly<{ id: string }>) => void,
 *   held: Test<H>,
 *   took: (id: string) => readonly H[],
 * }>} Presses
 */

/**
 * Runs presses' handlers. `down` gives the handler that took the press; `held` holds for a handler while a press it
 * took is down; `took` is the handlers a press that is down took
 * @template Q
 * @template {Handler} H
 * @param {(query: Q) => readonly H[]} find - The handlers bound to a press, best first
 * @returns {Presses<Q, H>} The presses
 */
function presses(find) {
  /** @type {Map<string, Readonly<{ press: Press<Q>, took: Set<H> }>>} */
  const going = new Map()
  /** @type {Set<(values?: readonly H[]) => void>} */
  const listeners = new Set()

  /**
   * Tells listeners which handlers changed
   * @param {readonly H[]} handlers - The handlers
   * @returns {void}
   */
  const tell = (handlers) => {
    if (handlers.length > 0) {
      for (const listener of listeners) {
        listener(handlers)
      }
    }
  }

  return {
    down(press) {
      const known = press.repeat ? going.get(press.id) : undefined
      const entry = known ?? { press, took: new Set() }
      if (known === undefined) {
        const replaced = going.get(press.id)
        going.set(press.id, entry)
        tell([...(replaced?.took ?? [])])
      }
      const handler = runFirst(find(entry.press.query), press.event, entry.press.typing)
      if (handler !== undefined && !entry.took.has(handler)) {
        entry.took.add(handler)
        tell([handler])
      }
      return handler
    },
    held: {
      has: (handler) => [...going.values()].some((each) => each.took.has(handler)),
      watch(listener) {
        listeners.add(listener)
        return () => {
          listeners.delete(listener)
        }
      },
    },
    took: (id) => [...(going.get(id)?.took ?? [])],
    up({ id }) {
      const ended = going.get(id)
      going.delete(id)
      tell([...(ended?.took ?? [])])
    },
  }
}

export { presses }
