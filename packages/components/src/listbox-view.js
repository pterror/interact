/**
 * @import { View } from '@interact/dom/component'
 * @import { TemplateResult } from '@interact/dom/template'
 * @import { Listbox } from './listbox.js'
 */

import { html, repeat } from '@interact/dom'

import { listboxStyles } from './listbox-styles.js'
import { offsetFor, rowAt, virtualRows } from './virtual-rows.js'

/**
 * What a listbox's web view keeps for itself: which position is the first scrollable row, the top the person last
 * scrolled to, and how far into that row they scrolled, in pixels.
 * @typedef {{ offset: number | undefined, scrolledTo: number | undefined, within: number }} Placed
 */

/**
 * Where each listbox's view is placed, by listbox, so each instance keeps its own.
 * @type {WeakMap<object, Placed>}
 */
const placed = new WeakMap()
const NONE = 0
const ONE = 1

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
  const fresh = { offset: undefined, scrolledTo: undefined, within: NONE }
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
  const { count } = listbox.items
  const offset = offsetFor({
    count,
    offset: state.offset,
    rows: listbox.scroll.rows.get(),
    top: listbox.scroll.top.get(),
  })
  state.offset = offset
  return offset
}

/**
 * An option's id: the listbox's id and its position.
 * @template T, F
 * @param {Listbox<T, F>} listbox - The listbox
 * @param {number} position - Where the option is
 * @returns {string} The id
 */
function optionId(listbox, position) {
  return `${listbox.id}-${String(position)}`
}

/**
 * The modifiers a pointer or key event had: Shift, and Control or Command as the toggle modifier.
 * @param {MouseEvent | KeyboardEvent} event - The event
 * @returns {import('./listbox-keys.js').Modifiers} What was held
 */
function modifiersOf(event) {
  return { shift: event.shiftKey, toggle: event.ctrlKey || event.metaKey }
}

/**
 * One option: its text, or nothing until it arrives, placed in its scrollable row, and hidden but present when it is
 * the active item outside the window.
 * @template T, F
 * @param {Listbox<T, F>} listbox - The listbox
 * @param {number} position - Where it is
 * @param {Readonly<{ offset: number, start: number, end: number }>} placement - The offset, and the window
 * @returns {TemplateResult} The option
 */
function option(listbox, position, placement) {
  const item = listbox.items.item(position)
  const selected = listbox.choose.isSelected(position)
  const active = listbox.active.get() === position
  const parts = `option${selected ? ' option-selected' : ''}${active ? ' option-active' : ''}`
  const offscreen = position < placement.start || position >= placement.end
  return html`<div
    part=${parts}
    role="option"
    id=${optionId(listbox, position)}
    aria-selected=${selected ? 'true' : 'false'}
    aria-setsize=${listbox.items.count}
    aria-posinset=${position + ONE}
    aria-busy=${item === undefined ? 'true' : false}
    data-offscreen=${offscreen}
    style=${`--interact-listbox-row: ${String(position - placement.offset)}`}
    @click=${(event) => {
      if (event instanceof MouseEvent) {
        listbox.choose.press(position, modifiersOf(event))
      }
    }}
    @dblclick=${() => {
      listbox.activate(position)
    }}
    >${item === undefined ? '' : listbox.text(item)}</div
  >`
}

/**
 * How tall a row is, in pixels, measured from the scrollable area the rows make.
 * @param {HTMLElement} viewport - The scrolling element
 * @param {number} count - How many items there are
 * @returns {number} The height, or NaN while there is nothing to measure
 */
function rowHeight(viewport, count) {
  const spacer = viewport.querySelector('[part~="spacer"]')
  const rows = virtualRows(count)
  return spacer && rows > NONE ? spacer.getBoundingClientRect().height / rows : Number.NaN
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
  const height = target instanceof HTMLElement ? rowHeight(target, listbox.items.count) : Number.NaN
  const state = placedFor(listbox)
  if (!(target instanceof HTMLElement) || !(height > NONE) || state.offset === undefined) {
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
 * Puts the scroll position where the listbox's top is, after a render: unchanged if it already shows that position,
 * so following the person scrolling never fights them. Moving the offset under the person keeps how far into the row
 * they were; anything else (a jump, a key) puts its top row exactly at the top.
 * @template T, F
 * @param {Listbox<T, F>} listbox - The listbox
 * @param {HTMLElement | ShadowRoot} root - Where the view is
 * @returns {void}
 */
function sync(listbox, root) {
  const viewport = root.querySelector('[part~="viewport"]')
  const state = placedFor(listbox)
  if (!(viewport instanceof HTMLElement) || state.offset === undefined) {
    return
  }
  const height = rowHeight(viewport, listbox.items.count)
  const top = listbox.scroll.top.get()
  const row = top - state.offset
  if (height > NONE && rowAt(viewport.scrollTop, height) !== row) {
    state.within = top === state.scrolledTo ? state.within : NONE
    viewport.scrollTop = row * height + state.within
  }
}

/**
 * What a listbox renders: the scrolling viewport, focused as a whole with the active option as its active
 * descendant; inside it, as many scrollable rows as the virtual count, and the options in the window, each in its row.
 * @template T, F
 * @param {Listbox<T, F>} listbox - The listbox
 * @returns {TemplateResult} The view
 */
function render(listbox) {
  const offset = placeOffset(listbox)
  const { end, start } = listbox.scroll.window()
  const active = listbox.active.get()
  const multiple = listbox.choose.mode === 'multiple'
  return html`<div
    part="viewport"
    role="listbox"
    tabindex="0"
    aria-label=${listbox.label === '' ? undefined : listbox.label}
    aria-multiselectable=${multiple ? 'true' : undefined}
    aria-activedescendant=${active === undefined ? undefined : optionId(listbox, active)}
    style=${`--interact-listbox-visible-rows: ${String(listbox.scroll.rows.get())}`}
    @focus=${() => {
      listbox.focus()
    }}
    @keydown=${(event) => {
      if (event instanceof KeyboardEvent && listbox.key(event.key, modifiersOf(event))) {
        event.preventDefault()
      }
    }}
    @scroll=${(event) => {
      scrolled(listbox, event.currentTarget)
    }}
    ><div part="spacer" style=${`--interact-listbox-virtual-rows: ${String(virtualRows(listbox.items.count))}`}
      >${repeat(
        listbox.positions(),
        (position) => position,
        (position) => option(listbox, position, { end, offset, start }),
      )}</div
    ></div
  >`
}

/**
 * The listbox's default web view.
 * @template T, F
 * @returns {View<Listbox<T, F>>} The view
 */
function listboxView() {
  return { kind: 'listbox', render, rendered: sync, styles: listboxStyles }
}

export { listboxView }
