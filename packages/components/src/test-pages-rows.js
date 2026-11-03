/**
 * What the listbox's browser tests about its scrollable rows run in their pages: row heights, zoom, and native
 * scrolling near the ends. Each reports what it saw, as plain values.
 * @import { DomMode } from '@interact/dom/css'
 * @import { Seen } from './test-page-listbox.js'
 */

import { pixels } from './row-measure.js'
import { TEN_BILLION } from './test-helpers.js'
import { fresh, middle, parts, seen, settle } from './test-page-listbox.js'

const FIVE_BILLION = 5_000_000_000
const NONE = 0
const QUARTER = 4
const ROWS = 10
const ROWS_SHORT = 6
const ZOOM = 2
const TALL_ROW = 600
const FRACTIONAL_ROW = 27.3

/**
 * How the view lays its rows out: a row's height in its own CSS pixels, and how many rows are scrollable.
 * @param {HTMLElement} viewport - The scrolling element
 * @returns {Readonly<{ height: number, scrollable: number }>} The layout
 */
function rowsOf(viewport) {
  const option = viewport.querySelector('[role="option"]')
  const spacer = viewport.querySelector('[part~="spacer"]')
  return {
    height: option ? pixels(getComputedStyle(option).height) : Number.NaN,
    scrollable:
      spacer instanceof HTMLElement ? Number(spacer.style.getPropertyValue('--interact-listbox-virtual-rows')) : NONE,
  }
}

/**
 * Zooms the page, makes rows tall enough that the default cap would pass every browser's limit on screen, and jumps
 * to five billion: what showed, how many rows are scrollable, and how tall the scrollable area is.
 * @param {DomMode} mode - Where the listbox lives
 * @returns {Promise<Seen & Readonly<{ scrollable: number, scrollHeight: number }>>} What showed
 */
async function zoomedTallRows(mode) {
  document.documentElement.style.zoom = String(ZOOM)
  document.documentElement.style.setProperty('--interact-listbox-row-height', `${String(TALL_ROW)}px`)
  const listbox = await fresh(mode)
  listbox.scroll.scrollTo(FIVE_BILLION)
  await settle()
  const { viewport } = parts()
  return { ...seen(), scrollHeight: viewport.scrollHeight, scrollable: rowsOf(viewport).scrollable }
}

/**
 * Gives rows a height that isn't a whole number of pixels and jumps to the last item and to five billion, where the
 * scrollable rows' pixels are near every browser's limit and rounding would show.
 * @param {DomMode} mode - Where the listbox lives
 * @returns {Promise<Readonly<{ last: Seen, fiveBillion: Seen }>>} What showed
 */
async function fractionalRows(mode) {
  document.documentElement.style.setProperty('--interact-listbox-row-height', `${String(FRACTIONAL_ROW)}px`)
  const listbox = await fresh(mode)
  listbox.scroll.scrollTo(TEN_BILLION)
  await settle()
  const last = seen()
  listbox.scroll.scrollTo(FIVE_BILLION)
  await settle()
  return { fiveBillion: seen(), last }
}

/**
 * A new listbox jumped to five billion, then scrolled natively to a few rows before the point where the next rows
 * down move the offset.
 * @param {DomMode} mode - Where the listbox lives
 * @returns {Promise<Readonly<{ across: number, down: number }>>} Where to put the mouse
 */
async function beforeRecentring(mode) {
  const listbox = await fresh(mode)
  listbox.scroll.scrollTo(FIVE_BILLION)
  await settle()
  const { viewport } = parts()
  const { height, scrollable } = rowsOf(viewport)
  const lastKept = scrollable - ROWS - scrollable / QUARTER
  viewport.scrollTop = (lastKept - ROWS_SHORT) * height
  await settle()
  return middle()
}

/**
 * A new listbox jumped to a few rows before the last top position.
 * @param {DomMode} mode - Where the listbox lives
 * @returns {Promise<Readonly<{ across: number, down: number }>>} Where to put the mouse
 */
async function beforeTheEnd(mode) {
  const listbox = await fresh(mode)
  listbox.scroll.scrollTo(TEN_BILLION - ROWS - ROWS_SHORT)
  await settle()
  return middle()
}

export { beforeRecentring, beforeTheEnd, fractionalRows, zoomedTallRows }
