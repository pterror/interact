/**
 * A Solid signal or memo as a Watched. A listener hears each change to the value, synchronously with the write that
 * made it (or at the end of the batch it is in), and only when the value is another one: an accessor that reran to
 * the same value tells no one. Made inside a Solid owner, it stops telling its listeners when that owner goes.
 */

/** @import { Accessor } from 'solid-js' */

import { createComputed, createRoot, getOwner, onCleanup, untrack } from 'solid-js'

/**
 * A signal or memo as a Watched
 * @template T
 * @param {Accessor<T>} accessor - The signal, memo or derived function
 * @returns {Readonly<{ get: () => T, watch: (listener: () => void) => () => void }>} Its value now, and hearing it
 *   change
 */
function toWatched(accessor) {
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
      const stop = createRoot((dispose) => {
        /** @type {{ value: T } | undefined} */
        let last = undefined
        createComputed(() => {
          const value = accessor()
          const changed = last !== undefined && !Object.is(last.value, value)
          last = { value }
          if (changed) {
            untrack(listener)
          }
        })
        return dispose
      }, owner ?? undefined)
      stops.add(stop)
      return () => {
        stops.delete(stop)
        stop()
      }
    },
  }
}

export { toWatched }
