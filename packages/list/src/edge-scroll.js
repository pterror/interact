/**
 * Scrolls while the pointer is near the top or bottom edge of a scroll container during a drag, faster the nearer.
 */

/** How near an edge, in pixels, scrolling starts */
const EDGE = 32
/** The most it scrolls in one frame, in pixels */
const SPEED = 16

/**
 * @typedef {Readonly<{
 *   element: Element,
 *   scrollBy: (pixels: number) => void,
 *   active: Readonly<{ get: () => boolean, watch: (listener: () => void) => () => void }>,
 * }>} EdgeScrollOptions
 */

/**
 * Scrolls near the edges while active
 * @param {EdgeScrollOptions} options - The scroll container, scrolling it, and whether a drag is under way
 * @returns {() => void} Stops
 */
function edgeScroll({ active, element, scrollBy }) {
  /** @type {number | undefined} */
  let pointerY = undefined
  /** @type {number | undefined} */
  let frame = undefined

  const tick = () => {
    frame = undefined
    if (!active.get() || pointerY === undefined) {
      return
    }
    const { bottom, top } = element.getBoundingClientRect()
    const fromTop = pointerY - top
    const fromBottom = bottom - pointerY
    if (fromTop < EDGE) {
      scrollBy(-Math.ceil(SPEED * (1 - Math.max(fromTop, 0) / EDGE)))
    } else if (fromBottom < EDGE) {
      scrollBy(Math.ceil(SPEED * (1 - Math.max(fromBottom, 0) / EDGE)))
    }
    frame = requestAnimationFrame(tick)
  }

  /**
   * @param {Event} event - A pointermove
   * @returns {void}
   */
  const moved = (event) => {
    if (event instanceof PointerEvent) {
      pointerY = event.clientY
    }
  }

  element.addEventListener('pointermove', moved)
  const stopWatching = active.watch(() => {
    if (active.get() && frame === undefined) {
      frame = requestAnimationFrame(tick)
    }
  })
  return () => {
    element.removeEventListener('pointermove', moved)
    stopWatching()
    if (frame !== undefined) {
      cancelAnimationFrame(frame)
    }
  }
}

export { edgeScroll }
