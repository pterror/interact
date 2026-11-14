/**
 * A popover 200 by 100 below or beside an anchor 40 by 20 put anywhere in the window, the anchor an element or a point,
 * for the browser tests of how `popover` keeps itself inside the window.
 */

import { cell, popover } from '@pterror/interact-list'

const ANCHOR_WIDTH = 40
const ANCHOR_HEIGHT = 20

/**
 * Where the popover and its anchor are drawn, and whether the browser placed it
 * @typedef {Readonly<{
 *   box: Readonly<{ left: number, top: number, right: number, bottom: number }>,
 *   anchor: Readonly<{ left: number, top: number, right: number, bottom: number }>,
 *   window: Readonly<{ width: number, height: number }>,
 *   byBrowser: boolean,
 * }>} PopoverSeen
 */

/** @type {(() => PopoverSeen) | undefined} */
let seen = undefined

/**
 * A box as plain numbers
 * @param {DOMRectReadOnly} rect - The box
 * @returns {PopoverSeen['box']} Its edges, rounded
 */
function edges(rect) {
  return {
    bottom: Math.round(rect.bottom),
    left: Math.round(rect.left),
    right: Math.round(rect.right),
    top: Math.round(rect.top),
  }
}

/**
 * Shows a popover against an anchor at a place in the window
 * @param {Readonly<{ x: number, y: number, point: boolean, side: 'below' | 'right' | 'left' }>} at - The anchor's top
 *   left corner, whether it is a point rather than an element, and the side
 * @returns {void}
 */
function putPopover({ point, side, x, y }) {
  document.body.style.margin = '0'
  const button = document.createElement('button')
  button.textContent = 'Open'
  button.style.cssText = `position: fixed; left: ${String(x)}px; top: ${String(y)}px; width: ${String(ANCHOR_WIDTH)}px; height: ${String(ANCHOR_HEIGHT)}px; padding: 0; border: 0`
  const panel = document.createElement('div')
  panel.style.cssText = 'width: 200px; height: 100px; padding: 0; border: 0; box-sizing: border-box'
  panel.textContent = 'Panel'
  document.body.append(button, panel)
  const anchor = point ? { getBoundingClientRect: () => new DOMRect(x, y, ANCHOR_WIDTH, ANCHOR_HEIGHT) } : button
  popover({ anchor, element: panel, open: cell(true), side })
  seen = () => ({
    anchor: edges(button.getBoundingClientRect()),
    box: edges(panel.getBoundingClientRect()),
    byBrowser: panel.style.getPropertyValue('position-try-fallbacks') !== '',
    window: { height: document.documentElement.clientHeight, width: document.documentElement.clientWidth },
  })
}

/**
 * Where the popover is now
 * @returns {PopoverSeen} What shows
 */
function seenPopover() {
  if (seen === undefined) {
    throw new Error('putPopover first')
  }
  return seen()
}

export { putPopover, seenPopover }
