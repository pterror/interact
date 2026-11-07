/**
 * A virtualized list's web view: its scrolling viewport and the rows in it, and where the view is placed, its own
 * state for each list (which position is the first scrollable row, the rows' pitch), following the person scrolling,
 * and putting the scroll position where the list's top is. Rows are measured in the page: the pitch they are laid out
 * at, in their own CSS pixels, which scroll positions are in; and on screen, which the browsers' limit on a scrollable
 * area is in.
 * @import { TemplateResult } from '@interact/dom/template'
 * @import { Listbox } from './listbox.js'
 * @import { Modifiers } from './listbox-keys.js'
 */

import { html, repeat } from '@interact/dom'

import { UNMEASURED_ROWS, offsetFor, rowAt, rowCap, virtualRows } from './virtual-rows.js'

/**
 * What every row has, whatever it shows: its id, its place among the items, whether only some of the items are rendered
 * (so assistive technology needs `setsize` and `posinset` to know where it is), whether it is the active item, whether
 * it is rendered only so it can be focused (outside the window), and the style that puts it in its scrollable row.
 * @typedef {Readonly<{
 *   id: string,
 *   position: number,
 *   setsize: number,
 *   posinset: number,
 *   partial: boolean,
 *   active: boolean,
 *   offscreen: boolean,
 *   style: string,
 * }>} Row
 */

/**
 * What a list's viewport is: its role, its id if anything refers to it, its accessible name (a label, or the id of
 * what names it), whether it selects several items, what each row renders, and what a key or focus entering it does.
 * `focusable` is false for a list whose focus stays elsewhere (a combobox's input, which then names the active row as
 * its own active descendant): the viewport is no Tab stop and names no active descendant, and so hears no keys and no
 * focus, which a focusable one needs `keydown` and `focus` for. It is no Tab stop by saying so (`tabindex="-1"`):
 * browsers make a scrolling element a Tab stop of its own otherwise.
 * @typedef {Readonly<{
 *   role: 'listbox' | 'menu',
 *   focusable?: boolean,
 *   id?: string,
 *   labelledby?: string,
 *   label: string | undefined,
 *   multiselectable: boolean,
 *   row: (row: Row) => TemplateResult,
 *   keydown?: (event: KeyboardEvent) => void,
 *   focus?: () => void,
 * }>} Viewport
 */

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

/**
 * How much an element is zoomed by CSS `zoom` on it and its ancestors, across shadow roots: `currentCSSZoom` where
 * the browser has it (Chrome, Firefox), else the product of each one's computed `zoom` (WebKit 27.2 has no
 * `currentCSSZoom`).
 * @param {Element} element - The element
 * @returns {number} The zoom
 */
function zoomOf(element) {
  if ('currentCSSZoom' in element && typeof element.currentCSSZoom === 'number') {
    return element.currentCSSZoom
  }
  let zoom = 1
  /** @type {Element | undefined} */
  let at = element
  while (at) {
    zoom *= Number(getComputedStyle(at).zoom) || 1
    const root = at.getRootNode()
    at = at.parentElement ?? (root instanceof ShadowRoot ? root.host : undefined)
  }
  return zoom
}

/**
 * A length in pixels as `getComputedStyle` gives it.
 * @param {string} value - The length, like "27.2969px"
 * @returns {number} The pixels, or NaN if it isn't in pixels
 */
function pixels(value) {
  return value.endsWith('px') ? Number(value.slice(0, -'px'.length)) : Number.NaN
}

/**
 * The pitch rows are laid out at, from one row's height in its own CSS pixels, and how far apart they are on screen,
 * zoom included.
 * @param {Element} row - A row
 * @returns {Readonly<{ pitch: number, screen: number }> | undefined} The pitches, unless the row has no height yet
 */
function measureRow(row) {
  const pitch = pixels(getComputedStyle(row).height)
  return pitch > 0 ? { pitch, screen: pitch * zoomOf(row) } : undefined
}

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
  const fresh = { cap: UNMEASURED_ROWS, offset: undefined, pitch: undefined, scrolledTo: undefined, within: 0 }
  placed.set(listbox, fresh)
  return fresh
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
 * After a render: renders again if measuring the rows changed their pitch or how many can be scrollable, and otherwise
 * puts the scroll position where the listbox's top is, unchanged if it already shows that position, so following the
 * person scrolling never fights them. Moving the offset under the person keeps how far into the row they were;
 * anything else (a jump, a key) puts its top row exactly at the top.
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
  const first = viewport.querySelector(':scope > [part~="spacer"] > [part~="row"]')
  const measured = first ? measureRow(first) : undefined
  const cap = measured ? rowCap(measured.screen) : state.cap
  if (measured && (measured.pitch !== state.pitch || cap !== state.cap)) {
    state.cap = cap
    state.pitch = measured.pitch
    again()
    return
  }
  const height = state.pitch
  const top = listbox.scroll.top.get()
  const row = top - state.offset
  if (height === undefined || rowAt(viewport.scrollTop, height) === row) {
    return
  }
  const within = top === state.scrolledTo ? state.within : 0
  viewport.scrollTop = row * height + within
  state.within = within
}

/**
 * A row's id: the listbox's id and its position.
 * @template T, F
 * @param {Listbox<T, F>} listbox - The listbox
 * @param {number} position - Where the row is
 * @returns {string} The id
 */
function rowId(listbox, position) {
  return `${listbox.id}-${String(position)}`
}

/**
 * The modifiers a pointer or key event had: Shift, and Control or Command as the toggle modifier.
 * @param {MouseEvent | KeyboardEvent} event - The event
 * @returns {Modifiers} What was held
 */
function modifiersOf(event) {
  return { shift: event.shiftKey, toggle: event.ctrlKey || event.metaKey }
}

/**
 * The id of the row focus is on, once its item has been read.
 * @template T, F
 * @param {Listbox<T, F>} listbox - The listbox
 * @returns {string | undefined} The id
 */
function activeDescendant(listbox) {
  const active = listbox.active.get()
  return active === undefined || listbox.items.item(active) === undefined ? undefined : rowId(listbox, active)
}

/**
 * A list's scrolling viewport, focused as a whole with the active row as its active descendant; inside it, as many
 * scrollable rows as the virtual count, and the rows in the window, each in its place, the active row too wherever it
 * is. The first scrollable row's position is kept unless the top has neared an edge, and remembered; the viewport's
 * custom properties say how many rows show, and the pitch rows are laid out at once it has been measured.
 * @template T, F
 * @param {Listbox<T, F>} listbox - The listbox
 * @param {Viewport} viewport - Its role, its name, and what its rows render
 * @returns {TemplateResult} The viewport
 */
function rowsViewport(listbox, viewport) {
  const state = placedFor(listbox)
  const offset = offsetFor({
    cap: state.cap,
    count: listbox.items.count,
    offset: state.offset,
    rows: listbox.scroll.rows.get(),
    top: listbox.scroll.top.get(),
  })
  state.offset = offset
  const rows = `--interact-visible-rows: ${String(listbox.scroll.rows.get())}`
  const style = state.pitch === undefined ? rows : `${rows}; --interact-pitch: ${String(state.pitch)}px`
  const { end, start } = listbox.scroll.window()
  const positions = listbox.positions()
  const { count } = listbox.items
  const focusable = viewport.focusable ?? true
  return html`<div
    part="viewport"
    role=${viewport.role}
    id=${viewport.id}
    tabindex=${focusable ? '0' : '-1'}
    aria-labelledby=${viewport.labelledby}
    aria-label=${viewport.label === undefined || viewport.label === '' ? undefined : viewport.label}
    aria-multiselectable=${viewport.multiselectable ? 'true' : undefined}
    aria-activedescendant=${focusable ? activeDescendant(listbox) : undefined}
    style=${style}
    @focus=${() => {
      viewport.focus?.()
    }}
    @keydown=${(event) => {
      if (event instanceof KeyboardEvent) {
        viewport.keydown?.(event)
      }
    }}
    @scroll=${(event) => {
      scrolled(listbox, event.currentTarget)
    }}
    ><div part="spacer" style=${`--interact-virtual-rows: ${String(virtualRows(count, state.cap))}`}
      >${repeat(
        positions,
        (position) => position,
        (position) =>
          viewport.row({
            active: listbox.active.get() === position,
            id: rowId(listbox, position),
            offscreen: position < start || position >= end,
            partial: positions.length < count,
            posinset: position + 1,
            position,
            setsize: count,
            style: `--interact-row: ${String(position - offset)}`,
          }),
      )}</div
    ></div
  >`
}

export { activeDescendant, measureRow, modifiersOf, pixels, rowId, rowsViewport, syncRows, zoomOf }
