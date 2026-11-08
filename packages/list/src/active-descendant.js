/**
 * The element that keeps focus names the active item with `aria-activedescendant`, so a screen reader follows the
 * item while focus stays put.
 */

/**
 * A value, and hearing it change
 * @template T
 * @typedef {Readonly<{ get: () => T, watch: (listener: () => void) => () => void }>} Watched
 */

/**
 * @template K
 * @typedef {Readonly<{ element: Element, active: Watched<K | undefined>, idOf: (key: K) => string }>}
 *   ActiveDescendantOptions
 */

/**
 * Keeps an element's `aria-activedescendant` on the active key's id; without one, the attribute is removed
 * @template K
 * @param {ActiveDescendantOptions<K>} options - The element with focus, the active key, and a key's id
 * @returns {() => void} Stops
 */
function activeDescendant({ active, element, idOf }) {
  const update = () => {
    const key = active.get()
    if (key === undefined) {
      element.removeAttribute('aria-activedescendant')
    } else {
      element.setAttribute('aria-activedescendant', idOf(key))
    }
  }
  update()
  return active.watch(update)
}

export { activeDescendant }
