/**
 * A Solid signal or memo of keys as a Drawn, for a list whose keys Solid holds.
 */

/** @import { Accessor } from 'solid-js' */

import { toWatched } from './to-watched.js'

/**
 * Keys in a signal or memo as a Drawn
 * @template K
 * @param {Accessor<readonly K[]>} accessor - The keys, in order, each once
 * @returns {Readonly<{ keys: () => readonly K[], watch: (listener: () => void) => () => void }>} The keys now, and
 *   hearing them change
 */
function toDrawn(accessor) {
  const watched = toWatched(accessor)
  return { keys: watched.get, watch: watched.watch }
}

export { toDrawn }
