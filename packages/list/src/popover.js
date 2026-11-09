/**
 * An element shown as a popover, placed against an anchor, while a Watched boolean is true. It is a `manual` popover:
 * what closes it is the app's (dismiss, a key), never the browser's light dismiss. The anchor is anything with a box:
 * an element, or a point (`{ getBoundingClientRect: () => new DOMRect(x, y, 0, 0) }`). While shown it is placed again
 * when the page scrolls or resizes.
 */

/**
 * Whether it is shown, and hearing that change
 * @typedef {Readonly<{ get: () => boolean, watch: (listener: () => void) => () => void }>} Open
 */

/**
 * What it is placed against: something with a box in the viewport's coordinates
 * @typedef {Readonly<{
 *   getBoundingClientRect: () => Readonly<{ left: number, top: number, right: number, bottom: number }>,
 * }>} Anchor
 */

/**
 * Where it goes against its anchor: under it, starting at its left edge; beside it, starting at its top; or with its
 * centre on the anchor's centre
 * @typedef {'below' | 'right' | 'center'} Side
 */

/**
 * @typedef {Readonly<{ element: HTMLElement, anchor: Anchor, open: Open, side?: Side }>} PopoverOptions
 */

/**
 * The point of an anchor's box a side places the element's corner (or, centred, its centre) at
 * @param {ReturnType<Anchor['getBoundingClientRect']>} box - The anchor's box
 * @param {Side} side - The side
 * @returns {Readonly<{ x: number, y: number }>} The point
 */
function pointOf(box, side) {
  if (side === 'center') {
    return { x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 }
  }
  return side === 'below' ? { x: box.left, y: box.bottom } : { x: box.right, y: box.top }
}

/**
 * Shows an element as a popover while `open` is true
 * @param {PopoverOptions} options - The element, what it is placed against, whether it is shown, and on which side
 *   (default below)
 * @returns {() => void} Stops, hiding it
 */
function popover({ anchor, element, open, side = 'below' }) {
  element.popover = 'manual'
  const place = () => {
    const { x, y } = pointOf(anchor.getBoundingClientRect(), side)
    element.style.margin = '0'
    element.style.inset = 'auto'
    element.style.left = `${String(x)}px`
    element.style.top = `${String(y)}px`
    if (side === 'center') {
      element.style.translate = '-50% -50%'
    }
  }
  /** @type {Window | undefined} */
  let following = undefined
  const follow = () => {
    const view = element.ownerDocument.defaultView ?? undefined
    if (open.get() && view !== undefined) {
      following = view
      view.addEventListener('scroll', place, { capture: true, passive: true })
      view.addEventListener('resize', place)
    }
  }
  const unfollow = () => {
    following?.removeEventListener('scroll', place, { capture: true })
    following?.removeEventListener('resize', place)
    following = undefined
  }
  const show = () => {
    unfollow()
    if (open.get()) {
      place()
      element.showPopover()
      follow()
    } else if (element.matches(':popover-open')) {
      element.hidePopover()
    }
  }
  show()
  const stop = open.watch(show)
  return () => {
    stop()
    unfollow()
    if (element.matches(':popover-open')) {
      element.hidePopover()
    }
  }
}

export { popover }
