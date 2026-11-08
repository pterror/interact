/**
 * A click on an item hands its key on.
 */

/**
 * @template K
 * @typedef {Readonly<{
 *   element: EventTarget,
 *   itemOf: (target: EventTarget | null) => Readonly<{ key: K }> | undefined,
 *   to: (key: K) => void,
 * }>} PickOptions
 */

/**
 * Hands on the key of each item clicked
 * @template K
 * @param {PickOptions<K>} options - Where clicks are heard, the item a click's target is in, and where its key goes
 * @returns {() => void} Stops
 */
function pick({ element, itemOf, to }) {
  /**
   * @param {Event} event - The click
   * @returns {void}
   */
  const clicked = (event) => {
    const item = itemOf(event.target)
    if (item !== undefined) {
      to(item.key)
    }
  }
  element.addEventListener('click', clicked)
  return () => {
    element.removeEventListener('click', clicked)
  }
}

export { pick }
