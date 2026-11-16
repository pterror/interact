/**
 * A Solid signal or memo as a Watched. A listener hears each change to the value as soon as Solid applies the write
 * that made it (in Solid 1 synchronously with it, or at the end of the batch it is in; in Solid 2 at the flush), and
 * only when the value is another one: an accessor that reran to the same value tells no one. Made inside a Solid
 * owner, it stops telling its listeners when that owner goes.
 */

/** @import { Accessor } from 'solid-js' */
/** @import { Adapter } from './adapter.js' */

import { createRoot, getOwner, onCleanup, runWithOwner, untrack } from 'solid-js'

/**
 * A value now, and hearing it change
 * @template T
 * @typedef {Readonly<{ get: () => T, watch: (listener: () => void) => () => void }>} Watched
 */

/**
 * Does nothing
 * @returns {void}
 */
function noop() {
  // Nothing to stop
}

/**
 * `toWatched` for a version of Solid
 * @param {Adapter} solid - The version's adapter
 * @returns {<T>(accessor: Accessor<T>) => Watched<T>} A signal or memo as a Watched
 */
function toWatchedWith(solid) {
  /**
   * A signal or memo as a Watched
   * @template T
   * @param {Accessor<T>} accessor - The signal, memo or derived function
   * @returns {Watched<T>} Its value now, and hearing it change
   */
  const toWatched = (accessor) => {
    const owner = getOwner()
    /** @type {Set<() => void>} */
    const stops = new Set()
    if (owner !== null) {
      onCleanup(() => {
        for (const stop of stops) {
          stop()
        }
        stops.clear()
      })
    }
    return {
      get: () => untrack(accessor),
      watch(listener) {
        /** @type {() => void} */
        let stop = noop
        runWithOwner(owner, () => {
          createRoot((dispose) => {
            stop = dispose
            /** @type {{ value: T } | undefined} */
            let last = undefined
            solid.watch(accessor, (value) => {
              const changed = last !== undefined && !Object.is(last.value, value)
              last = { value }
              if (changed) {
                listener()
              }
            })
          })
        })
        stops.add(stop)
        return () => {
          stops.delete(stop)
          stop()
        }
      },
    }
  }
  return toWatched
}

export { toWatchedWith }
