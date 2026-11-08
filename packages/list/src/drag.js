/**
 * Dragging an item to another place with the pointer. A press becomes a drag once the pointer moves a few pixels;
 * the click that ends a drag is swallowed, so it doesn't also pick.
 */

/** How far, in pixels, the pointer moves before a press is a drag */
const THRESHOLD = 4

/**
 * A drag under way: what is dragged, and where it would land
 * @template K
 * @typedef {Readonly<{ key: K, target: K, after: boolean }>} Dragging
 */

/**
 * @template K
 * @typedef {Readonly<{
 *   element: Element,
 *   itemOf: (target: EventTarget | null) => Readonly<{ key: K }> | undefined,
 *   gap: (point: Readonly<{ x: number, y: number }>) => Readonly<{ target: K, after: boolean }> | undefined,
 *   reorder: (key: K, target: K, after: boolean) => void,
 *   showing: (drag: Dragging<K> | undefined) => void,
 * }>} DragOptions
 */

/**
 * Lets items be dragged
 * @template K
 * @param {DragOptions<K>} options - Where items are, the item an element is in, the gap at a point, moving an item,
 *   and showing the drag (none when it ends)
 * @returns {() => void} Stops
 */
function drag({ element, gap, itemOf, reorder, showing }) {
  /** @type {{ key: K, x: number, y: number, pointer: number, moved: boolean, at: Dragging<K> | undefined } | undefined} */
  let press = undefined
  let swallow = false

  /**
   * @param {Event} event - A pointerdown
   * @returns {void}
   */
  const down = (event) => {
    const item = itemOf(event.target)
    if (!(event instanceof PointerEvent) || event.button !== 0 || item === undefined) {
      return
    }
    swallow = false
    press = { at: undefined, key: item.key, moved: false, pointer: event.pointerId, x: event.clientX, y: event.clientY }
  }

  /**
   * @param {Event} event - A pointermove
   * @returns {void}
   */
  const moved = (event) => {
    if (!(event instanceof PointerEvent) || press?.pointer !== event.pointerId) {
      return
    }
    if (!press.moved && Math.hypot(event.clientX - press.x, event.clientY - press.y) < THRESHOLD) {
      return
    }
    if (!press.moved) {
      press.moved = true
      element.setPointerCapture(event.pointerId)
    }
    event.preventDefault()
    const found = gap({ x: event.clientX, y: event.clientY })
    if (found !== undefined) {
      press.at = found.target === press.key ? undefined : { after: found.after, key: press.key, target: found.target }
      showing(press.at)
    }
  }

  /**
   * @param {Event} event - A pointerup or pointercancel
   * @returns {void}
   */
  const ended = (event) => {
    if (!(event instanceof PointerEvent) || press?.pointer !== event.pointerId) {
      return
    }
    const { at, moved: wasDrag } = press
    press = undefined
    if (!wasDrag) {
      return
    }
    swallow = true
    showing(undefined)
    if (event.type === 'pointerup' && at !== undefined) {
      reorder(at.key, at.target, at.after)
    }
  }

  /**
   * @param {Event} event - A click
   * @returns {void}
   */
  const clicked = (event) => {
    if (swallow) {
      swallow = false
      event.stopPropagation()
      event.preventDefault()
    }
  }

  element.addEventListener('pointerdown', down)
  element.addEventListener('pointermove', moved)
  element.addEventListener('pointerup', ended)
  element.addEventListener('pointercancel', ended)
  element.addEventListener('click', clicked, { capture: true })
  return () => {
    element.removeEventListener('pointerdown', down)
    element.removeEventListener('pointermove', moved)
    element.removeEventListener('pointerup', ended)
    element.removeEventListener('pointercancel', ended)
    element.removeEventListener('click', clicked, { capture: true })
  }
}

export { drag }
