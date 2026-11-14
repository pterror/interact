/**
 * The key beside each key on one side, asked of a Step when it is first wanted and kept while the key is drawn. Answers
 * may come late and in any order: a key takes only the answer to its latest question, and keeps its last answer until a
 * newer one comes, so what is shown doesn't flicker while the list asks again after a change. A key no longer drawn is
 * let go of, as `windowing` lets go of its rank, and asked about again if it is wanted again.
 */

/**
 * The key `by` keys on from `key`, stopping at the edge (so `key` itself at the edge)
 * @template K
 * @typedef {(key: K, by: number) => Promise<K | undefined>} Step
 */

/**
 * Hearing the keys whose neighbour may have changed (none: any)
 * @template K
 * @typedef {Readonly<{ watch: (listener: (keys?: readonly K[]) => void) => () => void }>} Changes
 */

/**
 * The keys drawn, and hearing them change
 * @template K
 * @typedef {Readonly<{ keys: () => readonly K[], watch: (listener: () => void) => () => void }>} Drawn
 */

/**
 * @template K
 * @typedef {Readonly<{ step: Step<K>, by: 1 | -1, changes: Changes<K>, drawn: Drawn<K> }>} AdjacentOptions
 */

/**
 * A key's neighbour: `undefined` until known, then `{ key }`, whose key is none at the list's edge; hearing the keys
 * whose neighbour became known or changed; and stopping
 * @template K
 * @typedef {Readonly<{
 *   of: (key: K) => Readonly<{ key: K | undefined }> | undefined,
 *   watch: (listener: (keys?: readonly K[]) => void) => () => void,
 *   stop: () => void,
 * }>} Adjacent
 */

/**
 * Follows each key's neighbour
 * @template K
 * @param {AdjacentOptions<K>} options - The Step, which way the neighbour is (`-1`: the key before), hearing the list
 *   change, and the keys drawn
 * @returns {Adjacent<K>} Each key's neighbour, asked for the first time it is wanted
 */
function adjacent({ by, changes, drawn, step }) {
  /** @type {Map<K, { key: K | undefined, fresh: boolean }>} */
  const known = new Map()
  /** @type {Map<K, number>} */
  const asking = new Map()
  let questions = 0
  /** @type {Set<(keys?: readonly K[]) => void>} */
  const listeners = new Set()

  const tell = (/** @type {readonly K[] | undefined} */ keys) => {
    for (const listener of listeners) {
      listener(keys)
    }
  }

  /**
   * Asks for a key's neighbour, taking the answer only if no later question was asked for that key
   * @param {K} key - The key
   * @returns {Promise<void>} When the answer is taken in or dropped
   */
  const ask = async (key) => {
    questions += 1
    const question = questions
    asking.set(key, question)
    const answer = await step(key, by)
      .then((near) => ({ near }))
      .catch(() => undefined)
    if (asking.get(key) !== question) {
      return
    }
    asking.delete(key)
    if (answer === undefined) {
      return
    }
    const near = answer.near === key ? undefined : answer.near
    const was = known.get(key)
    known.set(key, { fresh: true, key: near })
    if (was === undefined || was.key !== near) {
      tell([key])
    }
  }

  const stops = [
    changes.watch((keys) => {
      for (const key of keys ?? [...known.keys()]) {
        asking.delete(key)
        const was = known.get(key)
        if (was !== undefined) {
          was.fresh = false
        }
      }
      if (keys === undefined) {
        asking.clear()
      }
      tell(keys)
    }),
    drawn.watch(() => {
      const shown = new Set(drawn.keys())
      for (const key of [...known.keys(), ...asking.keys()]) {
        if (!shown.has(key)) {
          known.delete(key)
          asking.delete(key)
        }
      }
    }),
  ]

  return {
    of(key) {
      const was = known.get(key)
      if (was?.fresh !== true && !asking.has(key)) {
        void ask(key)
      }
      return was === undefined ? undefined : { key: was.key }
    },
    stop() {
      for (const stop of stops) {
        stop()
      }
      listeners.clear()
    },
    watch(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

export { adjacent }
