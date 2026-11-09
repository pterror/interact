/**
 * Release bindings ("k:up"): handlers run as a press comes up, found by what the press was looked up by as it went
 * down. A handler that took the press's down always gets its release, whatever its `when` says, so a hold can't be
 * left open; the others run as usual until one takes the event.
 */

import { applies, take } from './run-first.js'

/**
 * @typedef {Readonly<{ run: (event: Event) => boolean | void, when?: () => boolean, typing?: boolean }>} Handler
 */

/**
 * @template Q
 * @typedef {Readonly<{ id: string, query: Q, event: Event, typing: boolean, repeat: boolean }>} Press
 */

/**
 * A press coming up: its id, its event, whether it happened where text is typed, and whether it happened where
 * handlers don't run (inside an overlay), so only handlers its down ran run
 * @typedef {Readonly<{ id: string, event: Event, typing: boolean, blocked: boolean }>} Release
 */

/**
 * Where presses go on to; `down` gives the handler that took the press, if any
 * @template Q, H
 * @typedef {Readonly<{ down: (press: Press<Q>) => H | undefined, up: (release: Release) => void }>} Sink
 */

/**
 * @template Q, H
 * @typedef {Readonly<{
 *   find: (query: Q) => readonly H[],
 *   took: (id: string) => readonly H[],
 *   to: Sink<Q, H>,
 * }>} ReleasesOptions
 */

/**
 * Runs release bindings, then passes the release on
 * @template Q
 * @template {Handler} H
 * @param {ReleasesOptions<Q, H>} options - The release handlers bound to a press, best first; the handlers a press
 *   that is still down took; and where presses go on to
 * @returns {Sink<Q, H>} Where presses go
 */
function releases({ find, to, took }) {
  /** @type {Map<string, Q>} */
  const queries = new Map()
  return {
    down(press) {
      if (!press.repeat || !queries.has(press.id)) {
        queries.set(press.id, press.query)
      }
      return to.down(press)
    },
    up(release) {
      const query = queries.get(release.id)
      queries.delete(release.id)
      if (query !== undefined) {
        const ran = took(release.id)
        let taken = false
        for (const handler of find(query)) {
          const owed = ran.includes(handler)
          if (
            (owed || (!taken && !release.blocked && applies(handler, release.typing))) &&
            handler.run(release.event) !== false
          ) {
            take(release.event)
            taken = true
          }
        }
      }
      to.up(release)
    },
  }
}

export { releases }
