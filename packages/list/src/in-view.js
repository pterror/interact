/**
 * Keeps an element inside its window while a Watched boolean is true: whatever placed it (a popover against its anchor,
 * anything else), it is moved by the least that keeps its box a margin inside the window, on each edge it overflows.
 * A box larger than the window keeps its top and left edges in. The box is the element's layout box, without transforms. The move is the element's own `margin-left` and
 * `margin-top`, the only inline style it writes, so it composes with whatever writes the element's place.
 *
 * It looks once everything else that heard the boolean become true has (in a microtask, as `focusWhen` does), so the
 * element is shown and placed by then; and again before the next frame is drawn after the window scrolls or resizes
 * or the element changes size, so whatever placed it again has done so first.
 */

/**
 * Whether it is kept in view, and hearing that change
 * @typedef {Readonly<{ get: () => boolean, watch: (listener: () => void) => () => void }>} Open
 */

/**
 * @typedef {Readonly<{ element: HTMLElement, open: Open, margin?: number }>} InViewOptions
 */

/**
 * The least move along one axis that keeps `[from, to)` inside `[0, size)` by `margin`, the start edge first
 * @param {number} from - The box's start edge, px
 * @param {number} to - Its end edge, px
 * @param {number} size - The window's extent, px
 * @param {number} margin - The margin, px
 * @returns {number} The move, px
 */
function moveInto(from, to, size, margin) {
  const end = to > size - margin ? size - margin - to : 0
  return from + end < margin ? margin - from : end
}

/**
 * Where an element is laid out in its window, without its transforms: an element growing in as it opens is scaled for a
 * while, and where it ends up is its layout box. A shown popover is fixed, so its offsets are from the window.
 * @param {HTMLElement} element - The element
 * @returns {Readonly<{ left: number, top: number, right: number, bottom: number }>} Its box, px
 */
function layoutBox(element) {
  const left = element.offsetLeft
  const top = element.offsetTop
  return { bottom: top + element.offsetHeight, left, right: left + element.offsetWidth, top }
}

/**
 * Keeps `element` inside its window while `open` is true
 * @param {InViewOptions} options - The element, when it is kept in view, and the margin (px, default 8)
 * @returns {() => void} Stops, taking its move off
 */
function inView({ element, margin = 8, open }) {
  const view = element.ownerDocument.defaultView
  if (view === null) {
    return () => undefined
  }
  /** @type {number | undefined} */
  let frame = undefined
  const moved = { x: 0, y: 0 }
  const written = { x: '', y: '' }
  const write = () => {
    written.x = moved.x === 0 ? '' : `${String(moved.x)}px`
    written.y = moved.y === 0 ? '' : `${String(moved.y)}px`
    element.style.marginLeft = written.x
    element.style.marginTop = written.y
  }
  const fit = () => {
    frame = undefined
    if (!open.get()) {
      return
    }
    // A placement since the last fit may have written over the move; the box is then as it stands without it.
    if (element.style.marginLeft !== written.x) {
      moved.x = 0
    }
    if (element.style.marginTop !== written.y) {
      moved.y = 0
    }
    const box = layoutBox(element)
    moved.x += moveInto(box.left, box.right, view.innerWidth, margin)
    moved.y += moveInto(box.top, box.bottom, view.innerHeight, margin)
    write()
  }
  const later = () => {
    if (frame === undefined && open.get()) {
      frame = view.requestAnimationFrame(fit)
    }
  }
  const sized = typeof view.ResizeObserver === 'function' ? new view.ResizeObserver(later) : undefined
  sized?.observe(element)
  view.addEventListener('scroll', later, { capture: true, passive: true })
  view.addEventListener('resize', later)
  let was = open.get()
  const stop = open.watch(() => {
    const now = open.get()
    if (now && !was) {
      queueMicrotask(fit)
    }
    if (!now) {
      moved.x = 0
      moved.y = 0
      write()
    }
    was = now
  })
  if (was) {
    queueMicrotask(fit)
  }
  return () => {
    stop()
    sized?.disconnect()
    view.removeEventListener('scroll', later, { capture: true })
    view.removeEventListener('resize', later)
    if (frame !== undefined) {
      view.cancelAnimationFrame(frame)
    }
    moved.x = 0
    moved.y = 0
    write()
  }
}

export { inView }
