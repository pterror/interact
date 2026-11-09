/**
 * A Watched as a Solid accessor, owned by the Solid owner it is made in: it stops listening when that owner is
 * disposed.
 */

/** @import { Accessor } from 'solid-js' */

import { createSignal, onCleanup, untrack } from 'solid-js'

/**
 * A Watched as an accessor
 * @template T
 * @param {Readonly<{ get: () => T, watch: (listener: () => void) => () => void }>} watched - The value, and hearing it
 *   change
 * @returns {Accessor<T>} The value, tracked; computations rerun only when it is another value
 */
function fromWatched(watched) {
  const [value, setValue] = createSignal(untrack(() => watched.get()))
  onCleanup(
    watched.watch(() => {
      const next = untrack(() => watched.get())
      setValue(() => next)
    }),
  )
  return value
}

export { fromWatched }
