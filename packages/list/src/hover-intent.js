/**
 * The key under the pointer, handed on once the pointer rests on its item, so moving across a menu opens only the
 * submenu it stops at. A move restarts the wait; leaving the element ends it.
 */

/** How long the pointer rests before its item counts, in milliseconds **(P)** */
const REST_MS = 100

/**
 * @template K
 * @typedef {Readonly<{
 *   element: EventTarget,
 *   itemOf: (target: EventTarget | null) => Readonly<{ key: K }> | undefined,
 *   to: (key: K) => void,
 *   rest?: number,
 * }>} HoverIntentOptions
 */

/**
 * Hands on the key the pointer rests on
 * @template K
 * @param {HoverIntentOptions<K>} options - Where the pointer is followed, the item a target is in, where its key goes,
 *   and how long it rests first (default 100 ms)
 * @returns {() => void} Stops
 */
function hoverIntent({ element, itemOf, rest = REST_MS, to }) {
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let waiting = undefined
  const cancel = () => {
    clearTimeout(waiting)
    waiting = undefined
  }
  /**
   * @param {Event} event - A pointermove
   * @returns {void}
   */
  const moved = (event) => {
    cancel()
    const item = itemOf(event.target)
    if (item !== undefined) {
      waiting = setTimeout(() => {
        waiting = undefined
        to(item.key)
      }, rest)
    }
  }
  element.addEventListener('pointermove', moved)
  element.addEventListener('pointerleave', cancel)
  return () => {
    cancel()
    element.removeEventListener('pointermove', moved)
    element.removeEventListener('pointerleave', cancel)
  }
}

export { hoverIntent }
