/**
 * Dragging an item to another place with the pointer. A press becomes a drag once the pointer moves a few pixels;
 * where it would land is asked again whenever the pointer moves or anything scrolls under it; the click that ends a
 * drag is swallowed, so it doesn't also pick.
 */

/** How far, in pixels, the pointer moves before a press is a drag */
const THRESHOLD = 4

/**
 * A drag under way: what is dragged, and where it would land
 * @template K
 * @typedef {Readonly<{ key: K, target: K, after: boolean }>} Dragging
 */

/**
 * A point in the viewport, in CSS pixels
 * @typedef {Readonly<{ x: number, y: number }>} Point
 */

/**
 * The drag a question is about: the key dragged and where the pointer was pressed. One drag asks with the same record
 * each time, and no other drag asks with it
 * @template K
 * @typedef {Readonly<{ key: K, from: Point }>} Pressed
 */

/**
 * Where the pointer is in a drag, and how the drag stands: `moving`, then `dropped` (before reorder is called) or
 * `cancelled`, then `ended` (after reorder is called), each of the last three once
 * @template K
 * @typedef {Readonly<{ key: K, from: Point, point: Point, phase: 'moving' | 'dropped' | 'cancelled' | 'ended' }>}
 *   Motion
 */

/**
 * @template K
 * @typedef {Readonly<{
 *   element: Element,
 *   itemOf: (target: EventTarget | null) => Readonly<{ key: K }> | undefined,
 *   gap: (point: Point, drag: Pressed<K>) => Readonly<{ target: K, after: boolean }> | undefined,
 *   reorder: (key: K, target: K, after: boolean) => void,
 *   showing: (drag: Dragging<K> | undefined, motion: Motion<K>) => void,
 * }>} DragOptions
 */

/**
 * Lets items be dragged
 * @template K
 * @param {DragOptions<K>} options - Where items are, the item an element is in, the gap at a point during a drag (a
 *   gap at the dragged item itself lands nowhere), moving an item, and showing where the drag would land (none:
 *   nowhere, or no longer moving) with where the pointer is and how the drag stands
 * @returns {() => void} Stops
 */
function drag({ element, gap, itemOf, reorder, showing }) {
  /** @type {{ pressed: Pressed<K>, pointer: number, moved: boolean, at: Dragging<K> | undefined, point: Point } | undefined} */
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
    const point = { x: event.clientX, y: event.clientY }
    press = { at: undefined, moved: false, point, pointer: event.pointerId, pressed: { from: point, key: item.key } }
  }

  /**
   * @param {Readonly<NonNullable<typeof press>>} dragged - The drag
   * @param {Motion<K>['phase']} phase - How it stands
   * @returns {void}
   */
  const show = (dragged, phase) => {
    const { from, key } = dragged.pressed
    showing(phase === 'moving' ? dragged.at : undefined, { from, key, phase, point: dragged.point })
  }

  /**
   * Asks where the drag would land, with the pointer where it last was
   * @returns {void}
   */
  const aim = () => {
    if (press?.moved !== true) {
      return
    }
    const { key } = press.pressed
    const found = gap(press.point, press.pressed)
    if (found !== undefined) {
      press.at = found.target === key ? undefined : { after: found.after, key, target: found.target }
    }
    show(press, 'moving')
  }

  /**
   * @param {Event} event - A pointermove
   * @returns {void}
   */
  const moved = (event) => {
    if (!(event instanceof PointerEvent) || press?.pointer !== event.pointerId) {
      return
    }
    const { from } = press.pressed
    if (!press.moved && Math.hypot(event.clientX - from.x, event.clientY - from.y) < THRESHOLD) {
      return
    }
    if (!press.moved) {
      press.moved = true
      element.setPointerCapture(event.pointerId)
    }
    event.preventDefault()
    press.point = { x: event.clientX, y: event.clientY }
    aim()
  }

  /**
   * @param {Event} event - A pointerup or pointercancel
   * @returns {void}
   */
  const ended = (event) => {
    if (!(event instanceof PointerEvent) || press?.pointer !== event.pointerId) {
      return
    }
    const done = press
    press = undefined
    if (!done.moved) {
      return
    }
    swallow = true
    const dropped = event.type === 'pointerup'
    show(done, dropped ? 'dropped' : 'cancelled')
    if (dropped && done.at !== undefined) {
      reorder(done.at.key, done.at.target, done.at.after)
    }
    show(done, 'ended')
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
  const page = element.ownerDocument
  page.addEventListener('scroll', aim, { capture: true, passive: true })
  return () => {
    page.removeEventListener('scroll', aim, { capture: true })
    element.removeEventListener('pointerdown', down)
    element.removeEventListener('pointermove', moved)
    element.removeEventListener('pointerup', ended)
    element.removeEventListener('pointercancel', ended)
    element.removeEventListener('click', clicked, { capture: true })
  }
}

export { drag }
