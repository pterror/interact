/** @import { Align, Direction, Rect, Side } from '@interact/core/placement' */

import { place } from '@interact/core'

/**
 * A point on the screen, in CSS pixels from the viewport's top-left corner, as pointer events give it.
 * @typedef {Readonly<{ x: number, y: number }>} Point
 */

/**
 * What an overlay is placed against: an element, in any tree, or a point.
 * @typedef {Element | Point} Anchor
 */

/**
 * How an overlay is placed against its anchor: the side and alignment it prefers, the gap from the anchor, and the
 * margin from the viewport's edges, in CSS pixels.
 * @typedef {Readonly<{ side: Side, align: Align, gap: number, margin: number }>} Placement
 */

/** The custom properties and attributes an anchored overlay's stylesheet reads (`overlayStyles`). */
const PLACED = {
  anchored: 'data-anchored',
  height: '--interact-overlay-available-height',
  side: 'data-side',
  width: '--interact-overlay-available-width',
  x: '--interact-overlay-x',
  y: '--interact-overlay-y',
}

const NONE = 0

/**
 * Where an anchor is on the screen.
 * @param {Anchor} anchor - The anchor
 * @returns {Rect} Its rectangle; a point's has no size
 */
function rectOf(anchor) {
  if (anchor instanceof Element) {
    const box = anchor.getBoundingClientRect()
    return { height: box.height, width: box.width, x: box.left, y: box.top }
  }
  return { height: NONE, width: NONE, x: anchor.x, y: anchor.y }
}

/**
 * The direction inline text runs in an element.
 * @param {Element} element - The element
 * @returns {Direction} The direction
 */
function directionOf(element) {
  return getComputedStyle(element).direction === 'rtl' ? 'rtl' : 'ltr'
}

/**
 * Places an overlay once, at its size now.
 * @param {HTMLElement} element - The overlay
 * @param {Rect} anchor - Its anchor's rectangle
 * @param {Placement} placement - How it is placed
 * @returns {Readonly<{ fits: boolean }>} Whether it fits the room it has, or has to shrink into it
 */
function placeOnce(element, anchor, placement) {
  const box = element.getBoundingClientRect()
  const root = element.ownerDocument.documentElement
  const placed = place({
    ...placement,
    anchor,
    bounds: { height: root.clientHeight, width: root.clientWidth, x: NONE, y: NONE },
    direction: directionOf(element),
    size: { height: box.height, width: box.width },
  })
  element.style.setProperty(PLACED.x, `${String(placed.x)}px`)
  element.style.setProperty(PLACED.y, `${String(placed.y)}px`)
  element.style.setProperty(PLACED.width, `${String(placed.available.width)}px`)
  element.style.setProperty(PLACED.height, `${String(placed.available.height)}px`)
  element.setAttribute(PLACED.side, placed.side)
  return { fits: box.width <= placed.available.width && box.height <= placed.available.height }
}

/**
 * Places a shown overlay against its anchor: measured at its natural size, then again if it had to shrink into the
 * room it has, all before the browser paints, so it never shows anywhere else first.
 * @param {HTMLElement} element - The overlay, shown
 * @param {Anchor} anchor - What it is placed against
 * @param {Placement} placement - How
 * @returns {void}
 */
function position(element, anchor, placement) {
  element.setAttribute(PLACED.anchored, '')
  element.style.removeProperty(PLACED.width)
  element.style.removeProperty(PLACED.height)
  const rect = rectOf(anchor)
  if (!placeOnce(element, rect, placement).fits) {
    placeOnce(element, rect, placement)
  }
}

/**
 * Takes an overlay's placement off, so its stylesheet places it again.
 * @param {HTMLElement} element - The overlay
 * @returns {void}
 */
function unposition(element) {
  element.removeAttribute(PLACED.anchored)
  element.removeAttribute(PLACED.side)
  for (const property of [PLACED.x, PLACED.y, PLACED.width, PLACED.height]) {
    element.style.removeProperty(property)
  }
}

/**
 * Keeps a shown overlay placed against its anchor as the page scrolls, the window resizes, or either changes size,
 * once per frame however often they happen.
 */
class Following {
  /** @readonly */
  #view
  /** @readonly */
  #element
  /** @readonly */
  #sources
  /** @readonly */
  #sizes = new ResizeObserver(() => {
    this.handleEvent()
  })
  #frame = NONE

  /**
   * Starts following.
   * @param {Window} view - The overlay's window
   * @param {HTMLElement} element - The overlay, shown
   * @param {Readonly<{ anchor: () => Anchor | undefined, placement: () => Placement }>} sources - What it is placed
   *   against now, and how
   */
  constructor(view, element, sources) {
    this.#view = view
    this.#element = element
    this.#sources = sources
    this.#sizes.observe(element)
    const first = sources.anchor()
    if (first instanceof Element) {
      this.#sizes.observe(first)
    }
    view.addEventListener('scroll', this, { capture: true, passive: true })
    view.addEventListener('resize', this, { passive: true })
  }

  /**
   * Places the overlay again in the next frame, unless that is already asked for.
   * @returns {void}
   */
  handleEvent() {
    if (this.#frame !== NONE) {
      return
    }
    this.#frame = this.#view.requestAnimationFrame(() => {
      this.#frame = NONE
      const now = this.#sources.anchor()
      if (now !== undefined) {
        position(this.#element, now, this.#sources.placement())
      }
    })
  }

  /**
   * Stops following.
   * @returns {void}
   */
  stop() {
    this.#view.cancelAnimationFrame(this.#frame)
    this.#sizes.disconnect()
    this.#view.removeEventListener('scroll', this, { capture: true })
    this.#view.removeEventListener('resize', this)
  }
}

/**
 * Starts keeping a shown overlay placed against its anchor.
 * @param {HTMLElement} element - The overlay, shown
 * @param {() => Anchor | undefined} anchor - What it is placed against now
 * @param {() => Placement} placement - How it is placed now
 * @returns {Following | undefined} What follows it, unless it has no window
 */
function follow(element, anchor, placement) {
  const view = element.ownerDocument.defaultView
  return view === null ? undefined : new Following(view, element, { anchor, placement })
}

export { Following, PLACED, follow, position, unposition }
