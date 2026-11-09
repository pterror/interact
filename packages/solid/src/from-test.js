/**
 * A Test as a Solid accessor per key: whether it holds for the key, rerunning a computation only when that changes.
 */

import { fromKeyed } from './from-keyed.js'

/**
 * A Test as an accessor
 * @template K
 * @param {Readonly<{ has: (key: K) => boolean, watch: (listener: (keys?: readonly K[]) => void) => () => void }>} test
 *   - Whether it holds for a key, and hearing the keys it changed for (none: any)
 * @returns {(key: K) => boolean} Whether it holds for a key, tracked when read in a computation
 */
function fromTest(test) {
  return fromKeyed(
    (key) => test.has(key),
    (listener) => test.watch(listener),
  )
}

export { fromTest }
