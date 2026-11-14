/**
 * Dragging an item to another place with the pointer. A press becomes a drag once the pointer moves a few pixels;
 * where it would land is asked again whenever the pointer moves, anything scrolls under it or the drawn keys change;
 * the click that ends a drag is swallowed, so it doesn't also pick. The dragged key is held while the drag lasts, so
 * a list that draws its held keys keeps it drawn, and the drag is cancelled if the list removes it (the held key
 * moves off it). A drop ends once the reorder answers, whether it applied the change, refused it or failed. A press
 * lasts only while its button is held: a release anywhere ends it (dropping a drag), and a cancel, the pointer's
 * capture being lost or a move with the button up let it go (cancelling a drag).
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
 * `cancelled`, then `ended`, each of the last three once. `ended` comes once the reorder has answered, or once every
 * listener has heard the change that cancelled the drag, so what is drawn then is the list as it is, reordered or not
 * @template K
 * @typedef {Readonly<{ key: K, from: Point, point: Point, phase: 'moving' | 'dropped' | 'cancelled' | 'ended' }>}
 *   Motion
 */

/**
 * Moving an item next to another. It answers `true` once the list is as the move left it and every listener to the
 * list has heard, `false` if it won't move it; at once or later. A failure is taken as `false`
 * @template K
 * @typedef {(key: K, target: K, after: boolean) => PromiseLike<boolean> | boolean} Reorder
 */

/**
 * A press, and the drag it may become
 * @template K
 * @typedef {{ pressed: Pressed<K>, pointer: number, moved: boolean, at: Dragging<K> | undefined, point: Point }} Press
 */

/**
 * @template K
 * @typedef {Readonly<{
 *   element: Element,
 *   drawn: Readonly<{ watch: (listener: () => void) => () => void }>,
 *   held: Readonly<{ get: () => K | undefined, set: (key: K | undefined) => void,
 *     watch: (listener: () => void) => () => void }>,
 *   itemOf: (target: EventTarget | null) => Readonly<{ key: K }> | undefined,
 *   gap: (point: Point, drag: Pressed<K>) => Readonly<{ target: K, after: boolean }> | undefined,
 *   reorder: Reorder<K>,
 *   showing: (drag: Dragging<K> | undefined, motion: Motion<K>) => void,
 * }>} DragOptions
 */

/**
 * Lets items be dragged
 * @template K
 * @param {DragOptions<K>} options - Where items are; hearing the keys drawn change; a key the list holds (set to the
 *   dragged key, and none when the drag ends), to hold the dragged key with; the item an element is in; the gap at a
 *   point during a drag (a gap at the dragged item itself lands nowhere); moving an item; and showing where the drag
 *   would land (none: nowhere, or no longer moving) with where the pointer is and how the drag stands
 * @returns {() => void} Stops; a drag under way is cancelled and ended, and a drop waiting for its reorder ended
 */
function drag({ drawn, element, gap, held, itemOf, reorder, showing }) {
  /** @type {Press<K> | undefined} */
  let press = undefined
  /**
   * A drag dropped or cancelled whose `ended` hasn't come yet
   * @type {Readonly<Press<K>> | undefined}
   */
  let ending = undefined
  let swallow = false
  /** @type {Element | undefined} */
  let captor = undefined

  /**
   * @param {Readonly<Press<K>>} dragged - The drag
   * @param {Motion<K>['phase']} phase - How it stands
   * @returns {void}
   */
  const show = (dragged, phase) => {
    const { from, key } = dragged.pressed
    showing(phase === 'moving' ? dragged.at : undefined, { from, key, phase, point: dragged.point })
  }

  /**
   * Ends the drag waiting for its end, if there is one
   * @param {Readonly<Press<K>>} [only] - Only if it is this drag
   * @returns {void}
   */
  const end = (only) => {
    if (ending === undefined || (only !== undefined && ending !== only)) {
      return
    }
    const dragged = ending
    ending = undefined
    held.set(undefined)
    show(dragged, 'ended')
  }

  /**
   * Ends a drag waiting for its end once every listener has heard what is under way now
   * @param {Readonly<Press<K>>} dragged - The drag
   * @returns {void}
   */
  const endSoon = (dragged) => {
    if (ending !== dragged) {
      return
    }
    queueMicrotask(() => {
      end(dragged)
    })
  }

  /**
   * @param {Readonly<Press<K>>} dragged - The drag
   * @returns {void}
   */
  const cancel = (dragged) => {
    swallow = true
    show(dragged, 'cancelled')
    ending = dragged
  }

  /**
   * @param {Event} event - A pointerdown
   * @returns {void}
   */
  const down = (event) => {
    const item = itemOf(event.target)
    if (!(event instanceof PointerEvent) || event.button !== 0 || item === undefined) {
      return
    }
    end()
    swallow = false
    const point = { x: event.clientX, y: event.clientY }
    press = { at: undefined, moved: false, point, pointer: event.pointerId, pressed: { from: point, key: item.key } }
    // The pressed element, not the container, until a drag starts: a click goes to the element both the press and
    // release were on. A drag moves it to the container, which outlasts the dragged item's element.
    if (event.target instanceof Element) {
      captor = event.target
      captor.setPointerCapture(event.pointerId)
    }
  }

  /**
   * Lets go of the press without dropping it
   * @param {Event} event - A pointer event for it
   * @returns {void}
   */
  const lost = (event) => {
    if (!(event instanceof PointerEvent) || press?.pointer !== event.pointerId) {
      return
    }
    if (event.type === 'lostpointercapture' && event.target !== captor) {
      return
    }
    const gone = press
    press = undefined
    if (gone.moved) {
      cancel(gone)
      end(gone)
    }
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
    if (event.buttons % 2 === 0) {
      lost(event)
      return
    }
    const { from } = press.pressed
    if (!press.moved && Math.hypot(event.clientX - from.x, event.clientY - from.y) < THRESHOLD) {
      return
    }
    if (!press.moved) {
      press.moved = true
      held.set(press.pressed.key)
      captor = element
      element.setPointerCapture(event.pointerId)
    }
    event.preventDefault()
    press.point = { x: event.clientX, y: event.clientY }
    aim()
  }

  /**
   * @param {Readonly<Press<K>>} dropped - The drag
   * @param {Dragging<K>} at - Where it lands
   * @returns {void}
   */
  const drop = (dropped, at) => {
    ending = dropped
    const answered = () => {
      endSoon(dropped)
    }
    /** @type {PromiseLike<boolean> | boolean} */
    let answer
    try {
      answer = reorder(at.key, at.target, at.after)
    } catch {
      answered()
      return
    }
    if (typeof answer === 'boolean') {
      answered()
    } else {
      void Promise.resolve(answer).then(answered, answered)
    }
  }

  /**
   * @param {Event} event - A pointerup, anywhere
   * @returns {void}
   */
  const released = (event) => {
    if (!(event instanceof PointerEvent) || press?.pointer !== event.pointerId) {
      return
    }
    const done = press
    press = undefined
    if (!done.moved) {
      return
    }
    swallow = true
    show(done, 'dropped')
    if (done.at === undefined) {
      ending = done
      end(done)
    } else {
      drop(done, done.at)
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

  const page = element.ownerDocument
  element.addEventListener('pointerdown', down)
  element.addEventListener('pointermove', moved)
  page.addEventListener('pointerup', released, { capture: true })
  page.addEventListener('pointercancel', lost, { capture: true })
  page.addEventListener('lostpointercapture', lost, { capture: true })
  element.addEventListener('click', clicked, { capture: true })
  page.addEventListener('scroll', aim, { capture: true, passive: true })
  const stops = [
    // After every listener to the drawn keys has heard them change, so the gap measures them as drawn
    drawn.watch(() => {
      queueMicrotask(aim)
    }),
    held.watch(() => {
      if (press?.moved === true && held.get() !== press.pressed.key) {
        const gone = press
        press = undefined
        cancel(gone)
        endSoon(gone)
      }
    }),
  ]
  return () => {
    for (const stop of stops) {
      stop()
    }
    page.removeEventListener('scroll', aim, { capture: true })
    element.removeEventListener('pointerdown', down)
    element.removeEventListener('pointermove', moved)
    page.removeEventListener('pointerup', released, { capture: true })
    page.removeEventListener('pointercancel', lost, { capture: true })
    page.removeEventListener('lostpointercapture', lost, { capture: true })
    element.removeEventListener('click', clicked, { capture: true })
    const under = press
    press = undefined
    if (under?.moved === true) {
      cancel(under)
    }
    end()
  }
}

export { drag }
