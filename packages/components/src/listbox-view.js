/**
 * @import { View } from '@interact/dom/component'
 * @import { TemplateResult } from '@interact/dom/template'
 * @import { Listbox } from './listbox.js'
 */

import { html, repeat } from '@interact/dom'

import { listboxStyles } from './listbox-styles.js'
import { measureRow } from './row-measure.js'
import { UNMEASURED_ROWS, offsetFor, rowAt, rowCap, virtualRows } from './virtual-rows.js'

/**
 * What a listbox's web view keeps for itself: which position is the first scrollable row, the top the person last
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
  const { count } = listbox.items
  const offset = offsetFor({
    cap: state.cap,
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
 * The pitch rows are laid out at and how far apart they are on screen, measured from an option.
 * @param {HTMLElement} viewport - The scrolling element
 * @returns {Readonly<{ pitch: number, screen: number }> | undefined} The pitches, unless there is no option
 */
function measure(viewport) {
  const row = viewport.querySelector('[role="option"]')
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
 * @param {HTMLElement} root - Where the view is
 * @param {() => void} again - Asks for another render
 * @returns {void}
 */
function sync(listbox, root, again) {
  const viewport = root.querySelector('[part~="viewport"]')
  const state = placedFor(listbox)
  if (!(viewport instanceof HTMLElement) || state.offset === undefined) {
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
  const rows = `--interact-listbox-visible-rows: ${String(listbox.scroll.rows.get())}`
  return pitch === undefined ? rows : `${rows}; --interact-listbox-pitch: ${String(pitch)}px`
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
    aria-activedescendant=${
      active === undefined || listbox.items.item(active) === undefined ? undefined : optionId(listbox, active)
    }
    style=${viewportStyle(listbox)}
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
    ><div
      part="spacer"
      style=${`--interact-listbox-virtual-rows: ${String(virtualRows(listbox.items.count, placedFor(listbox).cap))}`}
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
