/**
 * A Solid signal or memo of keys as a Drawn, for a list whose keys Solid holds.
 */

/** @import { Accessor } from 'solid-js' */
/** @import { Adapter } from './adapter.js' */

import { toWatchedWith } from './to-watched.js'

/**
 * Keys now, and hearing them change
 * @template K
 * @typedef {Readonly<{ keys: () => readonly K[], watch: (listener: () => void) => () => void }>} Drawn
 */

/**
 * `toDrawn` for a version of Solid
 * @param {Adapter} solid - The version's adapter
 * @returns {<K>(accessor: Accessor<readonly K[]>) => Drawn<K>} Keys in a signal or memo as a Drawn
 */
function toDrawnWith(solid) {
  const toWatched = toWatchedWith(solid)
  /**
   * Keys in a signal or memo as a Drawn
   * @template K
   * @param {Accessor<readonly K[]>} accessor - The keys, in order, each once
   * @returns {Drawn<K>} The keys now, and hearing them change
   */
  const toDrawn = (accessor) => {
    const watched = toWatched(accessor)
    return { keys: watched.get, watch: watched.watch }
  }
  return toDrawn
}

export { toDrawnWith }
