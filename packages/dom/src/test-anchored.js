/**
 * What the anchored-positioning browser tests run in their pages: a popover placed against an anchor or a point, with
 * the overlay stylesheet, and where it ends up.
 * @import { Anchor, Placement } from './anchored.js'
 */

import { adoptStyles } from './adopt.js'
import { follow, position } from './anchored.js'
import { overlayStyles } from './overlay-styles.js'

/**
 * Where a placed popover is: its top-left corner and the side it went on, rounded to the pixel, and how much room it
 * was given.
 * @typedef {Readonly<{ x: number, y: number, side: string | undefined, height: number, availableHeight: string }>} Spot
 */

const THIRDS = 3
const FROM_BOTTOM = 30
const FROM_RIGHT = 40
const SCROLLED = 50
const NONE = 0
const SIZE = 'inline-size: 120px; block-size: 60px; padding: 0; border: 0'

/** @type {Placement} */
const BELOW = { align: 'start', gap: 4, margin: 8, side: 'block-end' }

/**
 * A light-DOM popover in the page, styled as an overlay is, shown.
 * @param {string} style - Its own size
 * @returns {HTMLElement} The popover
 */
function shownPopover(style) {
  adoptStyles(document, overlayStyles, { kind: 'overlay', mode: 'light' })
  const host = document.createElement('div')
  host.dataset['interact'] = 'overlay'
  const popover = document.createElement('div')
  popover.setAttribute('popover', 'manual')
  popover.style.cssText = style
  host.append(popover)
  document.body.append(host)
  popover.showPopover()
  return popover
}

/**
 * A box in the page, placed absolutely.
 * @param {Readonly<{ x: number, y: number }>} at - Where
 * @returns {HTMLElement} The box
 */
function anchorAt(at) {
  const anchor = document.createElement('button')
  anchor.textContent = 'Anchor'
  anchor.style.cssText = `position: absolute; left: ${String(at.x)}px; top: ${String(at.y)}px; inline-size: 80px; block-size: 20px`
  document.body.append(anchor)
  return anchor
}

/**
 * Where a popover is.
 * @param {HTMLElement} popover - The popover
 * @returns {Spot} Where
 */
function spotOf(popover) {
  const box = popover.getBoundingClientRect()
  return {
    availableHeight: popover.style.getPropertyValue('--interact-overlay-available-height'),
    height: Math.round(box.height),
    side: popover.dataset['side'],
    x: Math.round(box.x),
    y: Math.round(box.y),
  }
}

/**
 * Places a popover once.
 * @param {Anchor | 'bottom' | 'right'} anchor - An anchor, or a button at the bottom or right edge of the window
 * @param {string} [style] - The popover's own size
 * @returns {Spot} Where it went
 */
function placed(anchor, style = SIZE) {
  const popover = shownPopover(style)
  position(popover, targetFor(anchor), BELOW)
  return spotOf(popover)
}

/**
 * The anchor a test asks for: as given, or a button at the bottom or right edge of the window.
 * @param {Anchor | 'bottom' | 'right'} anchor - What was asked for
 * @returns {Anchor} The anchor
 */
function targetFor(anchor) {
  if (anchor === 'bottom') {
    return anchorAt({ x: 100, y: innerHeight - FROM_BOTTOM })
  }
  if (anchor === 'right') {
    return anchorAt({ x: innerWidth - FROM_RIGHT, y: 100 })
  }
  return anchor
}

/**
 * Places a popover too tall for either side of a button a third of the way down the window, which has more room below.
 * @returns {Readonly<{ spot: Spot, window: number }>} Where it went, and the window's height
 */
function shrunk() {
  const anchor = anchorAt({ x: 100, y: innerHeight / THIRDS })
  return { spot: placed(anchor, 'inline-size: 120px; block-size: 2000px; padding: 0; border: 0'), window: innerHeight }
}

/**
 * Waits for the next frame to be drawn.
 * @returns {Promise<void>} When it has been
 */
async function frame() {
  /** @type {PromiseWithResolvers<void>} */
  const drawn = Promise.withResolvers()
  requestAnimationFrame(() => {
    drawn.resolve()
  })
  await drawn.promise
}

/**
 * Scrolls the page down a little, and waits for two frames to be drawn.
 * @returns {Promise<void>} When they have been
 */
async function scrollAndWait() {
  scrollBy(NONE, SCROLLED)
  await frame()
  await frame()
}

/**
 * Places a popover against a button in a tall page, follows it, scrolls the page, and reports where it is after.
 * @returns {Promise<Readonly<{ before: Spot, after: Spot, anchorAfter: number }>>} Where it was and is, and where the
 *   button's bottom edge is now
 */
async function scrolled() {
  document.body.style.blockSize = '3000px'
  const popover = shownPopover(SIZE)
  const anchor = anchorAt({ x: 100, y: 200 })
  position(popover, anchor, BELOW)
  const before = spotOf(popover)
  const following = follow(
    popover,
    () => anchor,
    () => BELOW,
  )
  await scrollAndWait()
  following?.stop()
  return { after: spotOf(popover), anchorAfter: Math.round(anchor.getBoundingClientRect().bottom), before }
}

export { anchorAt, placed, scrolled, shrunk }
