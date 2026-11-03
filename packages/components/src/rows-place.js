/**
 * Where a list's web view is placed: the view's own state for each list (which position is the first scrollable row,
 * the rows' pitch), following the person scrolling, and putting the scroll position where the list's top is.
 * @import { Listbox } from './listbox.js'
 */

import { measureRow } from './row-measure.js'
import { UNMEASURED_ROWS, offsetFor, rowAt, rowCap } from './virtual-rows.js'

/**
 * What a list's web view keeps for itself: which position is the first scrollable row, the top the person last
 * scrolled to, how far into that row they scrolled, in pixels, the pitch rows are laid out at (measured once there is
 * a row, in its own CSS pixels), and how many rows can be scrollable at that pitch on screen.
 * @typedef {{
 *   offset: number | undefined,
 *   scrolledTo: number | undefined,
 *   within: number,
 *   pitch: number | undefined,
 *   cap: number,
 * }} Placed
 */

/**
 * Where each list's view is placed, by listbox, so each instance keeps its own.
 * @type {WeakMap<object, Placed>}
 */
const placed = new WeakMap()
const NONE = 0

/**
 * The view's own state for a listbox.
 * @param {object} listbox - The listbox
 * @returns {Placed} Its state
 */
function placedFor(listbox) {
  const known = placed.get(listbox)
  if (known) {
    return known
  }
  /** @type {Placed} */
  const fresh = { cap: UNMEASURED_ROWS, offset: undefined, pitch: undefined, scrolledTo: undefined, within: NONE }
  placed.set(listbox, fresh)
  return fresh
}

/**
 * Which position the first scrollable row is now, kept unless the top has neared an edge, and remembered.
 * @template T, F
 * @param {Listbox<T, F>} listbox - The listbox
 * @returns {number} The offset
 */
function placeOffset(listbox) {
  const state = placedFor(listbox)
  const offset = offsetFor({
    cap: state.cap,
    count: listbox.items.count,
    offset: state.offset,
    rows: listbox.scroll.rows.get(),
    top: listbox.scroll.top.get(),
  })
  state.offset = offset
  return offset
}

/**
 * The pitch rows are laid out at and how far apart they are on screen, measured from a row.
 * @param {HTMLElement} viewport - The scrolling element
 * @returns {Readonly<{ pitch: number, screen: number }> | undefined} The pitches, unless there is no row
 */
function measure(viewport) {
  const row = viewport.querySelector(':scope > [part~="spacer"] > [part~="row"]')
  return row ? measureRow(row) : undefined
}

/**
 * Follows the person scrolling: the scroll position says which scrollable row is at the top, and with the offset,
 * which position. The view keeps how far into that row it is, so the next render puts it back exactly.
 * @template T, F
 * @param {Listbox<T, F>} listbox - The listbox
 * @param {EventTarget | null} target - The scrolling element
 * @returns {void}
 */
function scrolled(listbox, target) {
  const state = placedFor(listbox)
  const height = state.pitch
  if (!(target instanceof HTMLElement) || height === undefined || state.offset === undefined) {
    return
  }
  const row = rowAt(target.scrollTop, height)
  state.within = target.scrollTop - row * height
  const top = state.offset + row
  state.scrolledTo = top
  if (top !== listbox.scroll.top.get()) {
    listbox.scroll.top.request(top)
  }
}

/**
 * The rows' pitch and how many can be scrollable at that pitch on screen, measured, if either differs from what the
 * view has now.
 * @param {HTMLElement} viewport - The scrolling element
 * @param {Readonly<Placed>} state - The view's state
 * @returns {Readonly<{ pitch: number, cap: number }> | undefined} What changed, if anything
 */
function remeasured(viewport, state) {
  const measured = measure(viewport)
  const cap = measured ? rowCap(measured.screen) : state.cap
  return measured && (measured.pitch !== state.pitch || cap !== state.cap) ? { cap, pitch: measured.pitch } : undefined
}

/**
 * Puts the scroll position where the listbox's top is, unchanged if it already shows that position, so following the
 * person scrolling never fights them. Moving the offset under the person keeps how far into the row they were;
 * anything else (a jump, a key) puts its top row exactly at the top.
 * @param {HTMLElement} viewport - The scrolling element
 * @param {Readonly<Placed>} state - The view's state
 * @param {number} top - The position at the top
 * @returns {number} How far into the top row the scroll position is now
 */
function place(viewport, state, top) {
  const height = state.pitch
  const row = top - (state.offset ?? NONE)
  if (height === undefined || rowAt(viewport.scrollTop, height) === row) {
    return state.within
  }
  const within = top === state.scrolledTo ? state.within : NONE
  viewport.scrollTop = row * height + within
  return within
}

/**
 * After a render: renders again if measuring the rows changed their pitch or how many can be scrollable, and otherwise
 * puts the scroll position where the listbox's top is.
 * @template T, F
 * @param {Listbox<T, F>} listbox - The listbox
 * @param {HTMLElement} viewport - Its scrolling element
 * @param {() => void} again - Asks for another render
 * @returns {void}
 */
function syncRows(listbox, viewport, again) {
  const state = placedFor(listbox)
  if (state.offset === undefined) {
    return
  }
  const changed = remeasured(viewport, state)
  if (changed) {
    Object.assign(state, changed)
    again()
    return
  }
  state.within = place(viewport, state, listbox.scroll.top.get())
}

/**
 * The viewport's custom properties: how many rows show, and the pitch rows are laid out at once it has been measured.
 * @template T, F
 * @param {Listbox<T, F>} listbox - The listbox
 * @returns {string} The style
 */
function viewportStyle(listbox) {
  const { pitch } = placedFor(listbox)
  const rows = `--interact-visible-rows: ${String(listbox.scroll.rows.get())}`
  return pitch === undefined ? rows : `${rows}; --interact-pitch: ${String(pitch)}px`
}

export { placeOffset, placedFor, scrolled, syncRows, viewportStyle }
