/**
 * An attribute that says whether a test holds for an element's key: one value while it does, another (or none) while
 * it doesn't.
 */

/**
 * Whether something holds for a key, and hearing the keys it changed for (none: any)
 * @template K
 * @typedef {Readonly<{ has: (key: K) => boolean, watch: (listener: (keys?: readonly K[]) => void) => () => void }>}
 *   Test
 */

/**
 * @template K
 * @typedef {Readonly<{ test: Test<K>, attribute: string, on: string, off?: string }>} MarkOptions
 */

/**
 * Marks elements whose key a test holds for
 * @template K
 * @param {MarkOptions<K>} options - The test, the attribute, its value while the test holds, and while it doesn't
 *   (left out: the attribute is removed)
 * @returns {Readonly<{ apply: (key: K, element: Element) => void,
 *   watch: (listener: (keys?: readonly K[]) => void) => () => void }>} The facet
 */
function mark({ attribute, off, on, test }) {
  return {
    apply(key, element) {
      const value = test.has(key) ? on : off
      if (value === undefined) {
        element.removeAttribute(attribute)
      } else {
        element.setAttribute(attribute, value)
      }
    },
    watch: (listener) => test.watch(listener),
  }
}

export { mark }
