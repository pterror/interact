/**
 * An element shown as a popover, placed against an anchor, while a Watched boolean is true. It is a `manual` popover:
 * what closes it is the app's (dismiss, a key), never the browser's light dismiss. The anchor is anything with a box:
 * an element, or a point (`{ getBoundingClientRect: () => new DOMRect(x, y, 0, 0) }`).
 *
 * Placed below or beside its anchor, it is kept inside the window: if it would come closer than a margin to the
 * window's edge on a side it grows towards, it is flipped to the anchor's other side across, then along, then both,
 * taking the first that fits (none fitting, it stays as first placed). Against an HTML element, in a browser with CSS
 * Anchor Positioning, it is shown with the element as its `source`, its implicit anchor, and the browser places it,
 * follows the anchor and flips it (`position-try-fallbacks`); otherwise it is placed and flipped the same way here, again when the page scrolls or resizes or the element changes size. A
 * centred popover is centred on its anchor, and not kept inside the window.
 */

/** How close, in CSS pixels, a popover comes to the window's edge before it is flipped */
const MARGIN = 8
const FLIPS = 'flip-block, flip-inline, flip-block flip-inline'

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
 * Where it goes against its anchor: under it, starting at its left edge; beside it on the right or on the left, starting at
 * its top; or with its centre on the anchor's centre
 * @typedef {'below' | 'right' | 'left' | 'center'} Side
 */

/**
 * @typedef {Readonly<{ element: HTMLElement, anchor: Anchor, open: Open, side?: Side }>} PopoverOptions
 */

/**
 * @typedef {ReturnType<Anchor['getBoundingClientRect']>} Box
 */

/**
 * One of a box's edges
 * @typedef {'left' | 'right' | 'top' | 'bottom'} Edge
 */

/**
 * A place for the element: which of its edges goes against which of the anchor's, across and down
 * @typedef {Readonly<{ x: readonly [Edge, Edge], y: readonly [Edge, Edge] }>} Placing
 */

/** @type {Readonly<Record<Edge, Edge>>} */
const OPPOSITE = { bottom: 'top', left: 'right', right: 'left', top: 'bottom' }

/**
 * Where a side puts the element first: its left edge on the anchor's left edge, its top on the anchor's bottom, ...
 * @param {Exclude<Side, 'center'>} side - The side
 * @returns {Placing} The place
 */
function placingOf(side) {
  if (side === 'below') {
    return { x: ['left', 'left'], y: ['top', 'bottom'] }
  }
  return { x: side === 'right' ? ['left', 'right'] : ['right', 'left'], y: ['top', 'top'] }
}

/**
 * The place flipped to the anchor's other side across (`block`, down the page) or along (`inline`), as CSS's
 * `flip-block` and `flip-inline` flip it
 * @param {Placing} placing - The place
 * @param {'x' | 'y'} axis - Which way it flips
 * @returns {Placing} The flipped place
 */
function flipped(placing, axis) {
  const [own, against] = placing[axis]
  return { ...placing, [axis]: [OPPOSITE[own], OPPOSITE[against]] }
}

/**
 * A place's box for an element of a size
 * @param {Placing} placing - The place
 * @param {Box} box - The anchor's box
 * @param {Readonly<{ width: number, height: number }>} size - The element's size
 * @returns {Box} Its box
 */
function boxAt(placing, box, size) {
  const [ownX, againstX] = placing.x
  const [ownY, againstY] = placing.y
  const left = ownX === 'left' ? box[againstX] : box[againstX] - size.width
  const top = ownY === 'top' ? box[againstY] : box[againstY] - size.height
  return { bottom: top + size.height, left, right: left + size.width, top }
}

/**
 * Whether a place's box keeps the margin to the window's edge on the sides it grows towards, and is inside it
 * @param {Placing} placing - The place
 * @param {Box} at - Its box
 * @param {Readonly<{ width: number, height: number }>} window - The window's size
 * @returns {boolean} Whether it fits
 */
function fits(placing, at, window) {
  const right = placing.x[0] === 'left' ? MARGIN : 0
  const left = MARGIN - right
  const bottom = placing.y[0] === 'top' ? MARGIN : 0
  const top = MARGIN - bottom
  return (
    at.left - left >= 0 && at.right + right <= window.width && at.top - top >= 0 && at.bottom + bottom <= window.height
  )
}

/**
 * Whether the browser places popovers against their anchors itself, flipping them to fit
 * @returns {boolean} Whether it does
 */
function anchoring() {
  return (
    typeof CSS !== 'undefined' && CSS.supports('top: anchor(bottom)') && CSS.supports('position-try-fallbacks', FLIPS)
  )
}

/**
 * Shows an element as a popover while `open` is true
 * @param {PopoverOptions} options - The element, what it is placed against, whether it is shown, and on which side
 *   (default below)
 * @returns {() => void} Stops, hiding it
 */
function popover({ anchor, element, open, side = 'below' }) {
  element.popover = 'manual'
  const page = element.ownerDocument
  const view = page.defaultView ?? undefined
  const { style } = element
  const source = view !== undefined && anchor instanceof view.HTMLElement ? anchor : undefined
  /**
   * Whether the browser places the element by its anchor (none: not known until it is first shown against it)
   * @type {boolean | undefined}
   */
  let anchored = source === undefined || view === undefined || !anchoring() ? false : undefined

  /**
   * Writes a place as the element's insets
   * @param {Placing} placing - The place
   * @param {(edge: Edge, against: Edge) => string} value - An inset's value
   * @returns {void}
   */
  const write = (placing, value) => {
    style.inset = 'auto'
    for (const [own, against] of [placing.x, placing.y]) {
      style.setProperty(own, value(own, against))
    }
  }

  /** @param {Placing} placing - The place, written for the browser to place by the anchor and flip */
  const writeAnchored = (placing) => {
    write(placing, (_own, against) => `anchor(${against})`)
    const right = placing.x[0] === 'left' ? MARGIN : 0
    const bottom = placing.y[0] === 'top' ? MARGIN : 0
    style.margin = `${String(MARGIN - bottom)}px ${String(right)}px ${String(bottom)}px ${String(MARGIN - right)}px`
    style.setProperty('position-anchor', 'auto')
    style.setProperty('position-try-fallbacks', FLIPS)
  }

  /**
   * Whether the browser took the anchor the popover was shown with: an inset by an anchor it doesn't have is its
   * fallback
   * @param {Placing} placing - The place
   * @returns {boolean} Whether it did
   */
  const takesAnchor = (placing) => {
    const [own, against] = placing.y
    style.setProperty('position-anchor', 'auto')
    style.setProperty(own, `anchor(${against}, -99999px)`)
    const value = getComputedStyle(element).getPropertyValue(own)
    return /^-?[\d.]+px$/u.test(value) && value !== '-99999px'
  }

  const place = () => {
    const box = anchor.getBoundingClientRect()
    if (side === 'center') {
      style.margin = '0'
      style.inset = 'auto'
      style.left = `${String((box.left + box.right) / 2)}px`
      style.top = `${String((box.top + box.bottom) / 2)}px`
      style.translate = '-50% -50%'
      return
    }
    const first = placingOf(side)
    anchored ??= takesAnchor(first)
    if (anchored) {
      writeAnchored(first)
      return
    }
    const { clientHeight, clientWidth } = page.documentElement
    const size = { height: element.offsetHeight, width: element.offsetWidth }
    const window = { height: clientHeight, width: clientWidth }
    const tried = [first, flipped(first, 'y'), flipped(first, 'x'), flipped(flipped(first, 'x'), 'y')]
    const chosen = tried.find((placing) => fits(placing, boxAt(placing, box, size), window)) ?? first
    style.margin = '0'
    write(chosen, (own, against) => {
      const at = box[against]
      const from = own === 'right' ? clientWidth - at : own === 'bottom' ? clientHeight - at : at
      return `${String(from)}px`
    })
  }

  /** @type {(() => void) | undefined} */
  let unfollow = undefined
  const follow = () => {
    if (view === undefined || anchored === true) {
      return
    }
    view.addEventListener('scroll', place, { capture: true, passive: true })
    view.addEventListener('resize', place)
    const resized = typeof view.ResizeObserver === 'function' ? new view.ResizeObserver(place) : undefined
    resized?.observe(element)
    unfollow = () => {
      view.removeEventListener('scroll', place, { capture: true })
      view.removeEventListener('resize', place)
      resized?.disconnect()
      unfollow = undefined
    }
  }
  const show = () => {
    unfollow?.()
    if (open.get()) {
      if (!element.matches(':popover-open')) {
        element.showPopover(source === undefined ? undefined : { source })
      }
      place()
      follow()
    } else if (element.matches(':popover-open')) {
      element.hidePopover()
    }
  }
  show()
  const stop = open.watch(show)
  return () => {
    stop()
    unfollow?.()
    if (element.matches(':popover-open')) {
      element.hidePopover()
    }
  }
}

export { popover }
