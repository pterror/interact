/**
 * An element shown as a popover, placed against another, while a Watched boolean is true. It is a `manual` popover:
 * what closes it is the app's (dismiss, a key), never the browser's light dismiss. While shown it is placed again
 * when the page scrolls or resizes.
 */

/**
 * Whether it is shown, and hearing that change
 * @typedef {Readonly<{ get: () => boolean, watch: (listener: () => void) => () => void }>} Open
 */

/**
 * Where it goes against its anchor: under it, starting at its left edge, or beside it, starting at its top
 * @typedef {'below' | 'right'} Side
 */

/**
 * @typedef {Readonly<{ element: HTMLElement, anchor: Element, open: Open, side?: Side }>} PopoverOptions
 */

/**
 * Shows an element as a popover while `open` is true
 * @param {PopoverOptions} options - The element, what it is placed against, whether it is shown, and on which side
 *   (default below)
 * @returns {() => void} Stops, hiding it
 */
function popover({ anchor, element, open, side = 'below' }) {
  element.popover = 'manual'
  const place = () => {
    const at = anchor.getBoundingClientRect()
    element.style.margin = '0'
    element.style.inset = 'auto'
    element.style.left = `${String(side === 'below' ? at.left : at.right)}px`
    element.style.top = `${String(side === 'below' ? at.bottom : at.top)}px`
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
