/**
 * A value handed on once it has stopped changing for a while, so a change made in many small steps (typing) is handed
 * on once, after a pause. `flush` hands on a change still waiting now (a field losing focus); `stop` drops it.
 */

/** How long a value rests before it is handed on, in milliseconds **(P)** */
const REST_MS = 800

/**
 * @template T
 * @typedef {Readonly<{ get: () => T, watch: (listener: () => void) => () => void }>} Watched
 */

/**
 * @template T
 * @typedef {Readonly<{ value: Watched<T>, to: (value: T) => void, rest?: number }>} RestedOptions
 */

/**
 * Hands on a value once it rests
 * @template T
 * @param {RestedOptions<T>} options - The value, where it goes, and how long it rests first (default 800 ms)
 * @returns {Readonly<{ flush: () => void, waiting: () => boolean, stop: () => void }>} Handing on what waits now,
 *   whether a change waits, and stopping
 */
function rested({ rest = REST_MS, to, value }) {
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer = undefined
  const cancel = () => {
    clearTimeout(timer)
    timer = undefined
  }
  const flush = () => {
    if (timer === undefined) {
      return
    }
    cancel()
    to(value.get())
  }
  const unwatch = value.watch(() => {
    cancel()
    timer = setTimeout(flush, rest)
  })
  return {
    flush,
    stop() {
      cancel()
      unwatch()
    },
    waiting: () => timer !== undefined,
  }
}

export { rested }
