/**
 * The element that keeps focus names the active item with `aria-activedescendant`, so a screen reader follows the
 * item while focus stays put. It is a facet: it names a key only when render applies it to that key's element, and
 * stops naming it when the key changes or the element is dropped, so it never names an element that isn't drawn.
 */

/**
 * The active key, and hearing it change
 * @template K
 * @typedef {Readonly<{ get: () => K | undefined, watch: (listener: () => void) => () => void }>} Active
 */

/**
 * @template K
 * @typedef {Readonly<{ element: Element, active: Active<K>, idOf: (key: K) => string }>} ActiveDescendantOptions
 */

/**
 * Names the active key's element on the element with focus
 * @template K
 * @param {ActiveDescendantOptions<K>} options - The element with focus, the active key, and a key's element id
 * @returns {Readonly<{ apply: (key: K, item: Element) => void, drop: (key: K) => void,
 *   watch: (listener: (keys?: readonly K[]) => void) => () => void }>} The facet
 */
function activeDescendant({ active, element, idOf }) {
  /** @type {{ key: K } | undefined} */
  let named = undefined
  const clear = () => {
    named = undefined
    element.removeAttribute('aria-activedescendant')
  }
  return {
    apply(key) {
      if (key === active.get()) {
        named = { key }
        element.setAttribute('aria-activedescendant', idOf(key))
      } else if (named?.key === key) {
        clear()
      }
    },
    drop(key) {
      if (named?.key === key) {
        clear()
      }
    },
    watch(listener) {
      return active.watch(() => {
        const key = active.get()
        if (named !== undefined && named.key !== key) {
          clear()
        }
        if (key !== undefined) {
          listener([key])
        }
      })
    },
  }
}

export { activeDescendant }
