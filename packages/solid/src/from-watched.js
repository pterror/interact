/**
 * A Watched as a Solid accessor, owned by the Solid owner it is made in: it stops listening when that owner is
 * disposed.
 */

/** @import { Accessor } from 'solid-js' */
/** @import { Adapter } from './adapter.js' */

import { onCleanup, untrack } from 'solid-js'

/**
 * `fromWatched` for a version of Solid
 * @param {Adapter} solid - The version's adapter
 * @returns {<T>(watched: Readonly<{ get: () => T, watch: (listener: () => void) => () => void }>) => Accessor<T>} A
 *   Watched as an accessor
 */
function fromWatchedWith(solid) {
  /**
   * A Watched as an accessor
   * @template T
   * @param {Readonly<{ get: () => T, watch: (listener: () => void) => () => void }>} watched - The value, and hearing
   *   it change
   * @returns {Accessor<T>} The value, tracked; computations rerun only when it is another value
   */
  const fromWatched = (watched) => {
    const [value, setValue] = solid.signal(untrack(() => watched.get()))
    onCleanup(
      watched.watch(() => {
        setValue(untrack(() => watched.get()))
      }),
    )
    return value
  }
  return fromWatched
}

export { fromWatchedWith }
