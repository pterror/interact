/**
 * @import { TemplateResult } from '@interact/dom/template'
 * @import { Listbox } from './listbox.js'
 * @import { Modifiers } from './listbox-keys.js'
 */

import { html, repeat } from '@interact/dom'

import { placeOffset, placedFor, scrolled, viewportStyle } from './rows-place.js'
import { virtualRows } from './virtual-rows.js'

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
 * its own active descendant): the viewport is no Tab stop and names no active descendant.
 * @typedef {Readonly<{
 *   role: 'listbox' | 'menu',
 *   focusable?: boolean,
 *   id?: string,
 *   labelledby?: string,
 *   label: string | undefined,
 *   multiselectable: boolean,
 *   row: (row: Row) => TemplateResult,
 *   keydown: (event: KeyboardEvent) => void,
 *   focus: () => void,
 * }>} Viewport
 */

const ONE = 1

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
 * What every row at a position has.
 * @template T, F
 * @param {Listbox<T, F>} listbox - The listbox
 * @param {number} position - Where it is
 * @param {Readonly<{ offset: number, start: number, end: number, rendered: number }>} placement - The offset, the
 *   window, and how many rows are rendered
 * @returns {Row} The row
 */
function rowAtPosition(listbox, position, placement) {
  return {
    active: listbox.active.get() === position,
    id: rowId(listbox, position),
    offscreen: position < placement.start || position >= placement.end,
    partial: placement.rendered < listbox.items.count,
    posinset: position + ONE,
    position,
    setsize: listbox.items.count,
    style: `--interact-row: ${String(position - placement.offset)}`,
  }
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
 * is.
 * @template T, F
 * @param {Listbox<T, F>} listbox - The listbox
 * @param {Viewport} viewport - Its role, its name, and what its rows render
 * @returns {TemplateResult} The viewport
 */
function rowsViewport(listbox, viewport) {
  const offset = placeOffset(listbox)
  const { end, start } = listbox.scroll.window()
  const positions = listbox.positions()
  const rendered = positions.length
  const focusable = viewport.focusable ?? true
  return html`<div
    part="viewport"
    role=${viewport.role}
    id=${viewport.id}
    tabindex=${focusable ? '0' : undefined}
    aria-labelledby=${viewport.labelledby}
    aria-label=${viewport.label === undefined || viewport.label === '' ? undefined : viewport.label}
    aria-multiselectable=${viewport.multiselectable ? 'true' : undefined}
    aria-activedescendant=${focusable ? activeDescendant(listbox) : undefined}
    style=${viewportStyle(listbox)}
    @focus=${() => {
      viewport.focus()
    }}
    @keydown=${(event) => {
      if (event instanceof KeyboardEvent) {
        viewport.keydown(event)
      }
    }}
    @scroll=${(event) => {
      scrolled(listbox, event.currentTarget)
    }}
    ><div
      part="spacer"
      style=${`--interact-virtual-rows: ${String(virtualRows(listbox.items.count, placedFor(listbox).cap))}`}
      >${repeat(
        positions,
        (position) => position,
        (position) => viewport.row(rowAtPosition(listbox, position, { end, offset, rendered, start })),
      )}</div
    ></div
  >`
}

export { activeDescendant, modifiersOf, rowId, rowsViewport }
