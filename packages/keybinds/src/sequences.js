/**
 * Bindings of several steps: "g i", "ctrl+k ctrl+s", "k k" for a double tap. Each step must come within `timeout` of
 * the last. A press that starts or continues a sequence whose handlers may run is the sequence's: it is taken and goes
 * no further. A press that completes one runs the first of its handlers that applies; if none does, or a press goes
 * on from no sequence, it goes on as a press of its own.
 */

import { applies, runFirst, take } from './run-first.js'

/**
 * @typedef {Readonly<{ run: (event: Event) => boolean | void, when?: () => boolean, typing?: boolean }>} Handler
 */

/**
 * A press's lookups, best first
 * @typedef {Readonly<{ exact: readonly string[] }>} Query
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
 * @template {Query} Q
 * @template H
 * @typedef {Readonly<{ entries: readonly (readonly [readonly string[], H])[], timeout?: number, to: Sink<Q, H> }>}
 *   SequencesOptions
 */

const DEFAULT_TIMEOUT = 1000

/**
 * Adds a handler under a key
 * @template H
 * @param {Map<string, H[]>} map - Where
 * @param {string} key - The key
 * @param {H} handler - The handler
 * @returns {void}
 */
function add(map, key, handler) {
  const list = map.get(key)
  if (list === undefined) {
    map.set(key, [handler])
  } else {
    list.push(handler)
  }
}

/**
 * Runs sequences, passing on every press that isn't one's
 * @template {Query} Q
 * @template {Handler} H
 * @param {SequencesOptions<Q, H>} options - Each sequence's steps' lookups with its handler; most ms between steps
 *   (default 1000); and where presses go on to
 * @returns {Sink<Q, H>} Where presses go
 */
function sequences({ entries, timeout = DEFAULT_TIMEOUT, to }) {
  /** @type {Map<string, H[]>} */
  const starts = new Map()
  /** @type {Map<string, H[]>} */
  const whole = new Map()
  for (const [steps, handler] of entries) {
    for (let end = 1; end < steps.length; end += 1) {
      add(starts, steps.slice(0, end).join(' '), handler)
    }
    add(whole, steps.join(' '), handler)
  }
  /** @type {Readonly<{ at: number, steps: string }> | undefined} */
  let pending = undefined
  /** @type {Set<string>} */
  const taken = new Set()

  /**
   * A press as the start or continuation of a sequence, or as the end of one
   * @param {readonly string[]} lookups - The press's lookups, each after the steps so far if there are any
   * @param {Press<Q>} press - The press
   * @param {number} now - When it went down
   * @returns {Readonly<{ took: H | undefined }> | undefined} The handler that took it if it ended a sequence; nothing
   *   if it wasn't a sequence's
   */
  const step = (lookups, press, now) => {
    const started = lookups.find((lookup) =>
      (starts.get(lookup) ?? []).some((handler) => applies(handler, press.typing)),
    )
    if (started !== undefined) {
      pending = { at: now, steps: started }
      take(press.event)
      return { took: undefined }
    }
    const took = runFirst([...new Set(lookups.flatMap((lookup) => whole.get(lookup) ?? []))], press.event, press.typing)
    return took === undefined ? undefined : { took }
  }

  return {
    down(press) {
      if (press.repeat && taken.has(press.id)) {
        take(press.event)
        return undefined
      }
      if (press.repeat) {
        return to.down(press)
      }
      const now = performance.now()
      const before = pending !== undefined && now - pending.at <= timeout ? pending.steps : undefined
      pending = undefined
      const lookups = press.query.exact
      const tries = before === undefined ? [lookups] : [lookups.map((lookup) => `${before} ${lookup}`), lookups]
      for (const each of tries) {
        const stepped = step(each, press, now)
        if (stepped !== undefined) {
          taken.add(press.id)
          return stepped.took
        }
      }
      return to.down(press)
    },
    up(release) {
      if (!taken.delete(release.id)) {
        to.up(release)
      }
    },
  }
}

export { sequences }
