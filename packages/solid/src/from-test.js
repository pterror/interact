/**
 * A Test as a Solid accessor per key: whether it holds for the key, rerunning a computation only when that changes.
 */

/** @import { Adapter } from './adapter.js' */

import { fromKeyedWith } from './from-keyed.js'

/**
 * A Test: whether it holds for a key, and hearing the keys it changed for (none: any)
 * @template K
 * @typedef {Readonly<{ has: (key: K) => boolean, watch: (listener: (keys?: readonly K[]) => void) => () => void }>} Test
 */

/**
 * `fromTest` for a version of Solid
 * @param {Adapter} solid - The version's adapter
 * @returns {<K>(test: Test<K>) => (key: K) => boolean} A Test as an accessor
 */
function fromTestWith(solid) {
  const fromKeyed = fromKeyedWith(solid)
  /**
   * A Test as an accessor
   * @template K
   * @param {Test<K>} test - The Test
   * @returns {(key: K) => boolean} Whether it holds for a key, tracked when read in a computation
   */
  const fromTest = (test) =>
    fromKeyed(
      (key) => test.has(key),
      (listener) => test.watch(listener),
    )
  return fromTest
}

export { fromTestWith }
