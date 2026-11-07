/**
 * @import { Attributes, ListPipeline, RenderRow, Row, Rows } from '@interact/core/list-pipeline'
 * @import { ItemSource } from '@interact/core/source'
 * @import { Builder, EffectType, Extension, Field, State, Transaction } from '@interact/core/state'
 */

import { defineEffect, defineField, rowsOf } from '@interact/core'
import { inOwnView, ownElement, viewPlugin } from '@interact/dom'

import { measureRow } from './measure-rows.js'
import { UNMEASURED_ROWS, clamp, offsetFor, rowAt, rowCap, virtualRows } from './virtual-rows.js'

/** Rows rendered beyond each edge of what shows, so a short scroll finds them there. */
const OVERSCAN = 5
const DEFAULT_ROWS = 10

/**
 * Where a windowed list is: the position at the top, which is the source of truth for where it is scrolled; which
 * position the first scrollable row is (`offset`); the pitch rows are laid out at, in their own CSS pixels, once
 * measured; and how many rows can be scrollable at that pitch on screen (`cap`).
 * @typedef {Readonly<{ top: number, offset: number, pitch: number | undefined, cap: number }>} Placement
 */

/**
 * How a row is measured: its pitch in its own CSS pixels, and on screen with its zoom.
 * @typedef {Readonly<{ pitch: number, cap: number }>} Measured
 */

/**
 * Windowing: a list renders only the rows that show and a few either side (`OVERSCAN`), a gap standing for the rest
 * before and after, and the positions some extension keeps (the active item, hidden but present). Where it is
 * scrolled is a position, the top, turned into pixels after each render and back from each scroll event, so moving by
 * keys, `scrollTo` and restoring a view land exactly. It lands exactly in lists far longer than a browser can scroll:
 * at most `cap` rows are scrollable, under the smallest limit measured in Chrome, Firefox and WebKit, and an offset says
 * which position the first of them is, moved as the top nears either edge (after Vaadin Grid). Rows have one height,
 * the component's `--_row-height`, measured once there is a row. A revealed item is scrolled to just enough, and the
 * list says which positions show (`visible`) and that it shows revealed items itself (`reveals`). When only some rows
 * are rendered, each says its place and the list's size (`aria-posinset`, `aria-setsize`). Its structure is in
 * `windowingStyles`, which a component joins into its stylesheet.
 * @template T, R
 * @template {ItemSource<T>} S
 */
class Windowing {
  /**
   * Scrolls so a position is at the top, or as near as the end of the list allows.
   * @readonly
   * @type {EffectType<number>}
   */
  scrollTo = defineEffect()
  /**
   * The person scrolled the list to a top position.
   * @readonly
   * @type {EffectType<number>}
   */
  scrolled = defineEffect()
  /**
   * Rows were measured in the page.
   * @readonly
   * @type {EffectType<Measured>}
   */
  measured = defineEffect()
  /**
   * How many rows show at once.
   * @readonly
   * @type {number}
   */
  rows
  /**
   * Whether the list shows fewer rows when it has fewer items.
   * @readonly
   * @type {boolean}
   */
  shrink
  /**
   * @readonly
   * @type {Field<Placement>}
   */
  field
  /**
   * @readonly
   * @type {ListPipeline<T, R, S>}
   */
  #list

  /**
   * @param {ListPipeline<T, R, S>} list - The list
   * @param {number} rows - How many rows show at once
   * @param {number} top - The position at the top at first
   * @param {boolean} shrink - Whether it shows fewer rows when it has fewer items
   */
  constructor(list, rows, top, shrink) {
    this.#list = list
    this.rows = rows
    this.shrink = shrink
    this.field = defineField({
      create: (state) =>
        this.#placed({ cap: UNMEASURED_ROWS, offset: undefined, pitch: undefined, top }, list.listOf(state).count()),
      update: (value, transaction) => this.#next(value, transaction),
    })
  }

  /**
   * Puts windowing in a configuration.
   * @param {Builder} into - The configuration being built
   * @param {number} level - Its level
   * @returns {void}
   */
  install(into, level) {
    const list = this.#list
    /** @type {Extension} */
    const parts = [
      list.extension,
      this.field,
      list.reveals.of(true),
      list.visible.of((state) => {
        const { top } = state.field(this.field)
        return { end: Math.min(list.listOf(state).count(), top + this.rows), start: top }
      }),
      list.rows.of((rows, state) => this.#window(rows.length, state)),
      list.attributes.of((row, state) => this.#rowAttributes(row, state)),
      list.containerAttributes.of((state) => {
        const { pitch } = state.field(this.field)
        const rows = this.shrink ? Math.min(this.rows, list.listOf(state).count()) : this.rows
        const shown = `--interact-visible-rows: ${String(rows)}`
        return {
          'data-windowed': true,
          style: pitch === undefined ? shown : `${shown}; --interact-pitch: ${String(pitch)}px`,
        }
      }),
      this.#page(),
    ]
    into.add(parts, level)
  }

  /**
   * Where the list is in a state.
   * @param {State} state - The state
   * @returns {Placement} Its top, offset, pitch and cap
   */
  placementIn(state) {
    return state.field(this.field)
  }

  /**
   * Where the list is after a transaction: the top moved with the list's changes (kept where it was, as far as the
   * items reach, when the list is replaced), then by each scroll, jump and reveal in turn, then by a measurement.
   * @param {Placement} value - Where it was
   * @param {Transaction} transaction - The transaction
   * @returns {Placement} Where it is
   */
  #next(value, transaction) {
    const list = this.#list
    let top = list.mapPosition(value.top, transaction) ?? value.top
    let { cap, pitch } = value
    for (const effect of transaction.effects) {
      if (effect.is(this.scrollTo) || effect.is(this.scrolled)) {
        top = Math.floor(effect.value)
      } else if (effect.is(list.reveal)) {
        const revealed = effect.value
        top = revealed < top ? revealed : Math.max(top, revealed - this.rows + 1)
      } else if (effect.is(this.measured)) {
        cap = effect.value.cap
        pitch = effect.value.pitch
      }
    }
    const placed = this.#placed({ cap, offset: value.offset, pitch, top }, list.listOf(transaction.state).count())
    const same = placed.top === value.top && placed.offset === value.offset && placed.pitch === value.pitch
    return same && placed.cap === value.cap ? value : placed
  }

  /**
   * A placement kept inside the list: the top no further than shows the last item in the last row, and the offset
   * kept unless the top has neared an edge of the scrollable rows.
   * @param {Readonly<{ top: number, offset: number | undefined, pitch: number | undefined, cap: number }>} wanted - The
   *   placement wanted
   * @param {number} count - How many items there are
   * @returns {Placement} The placement
   */
  #placed({ cap, offset, pitch, top }, count) {
    const kept = clamp(top, 0, Math.max(0, count - this.rows))
    return { cap, offset: offsetFor({ cap, count, offset, rows: this.rows, top: kept }), pitch, top: kept }
  }

  /**
   * The first and last positions rendered, besides those kept: what shows, and the overscan either side.
   * @param {number} count - How many rows there are
   * @param {State} state - The state
   * @returns {Readonly<{ start: number, end: number }>} From the first up to the one after the last
   */
  #range(count, state) {
    const { top } = state.field(this.field)
    return { end: Math.min(count, top + this.rows + OVERSCAN), start: Math.max(0, top - OVERSCAN) }
  }

  /**
   * The rows rendered: a gap for the rows before the window, the window's, the positions kept outside it, and a gap
   * for the rows after.
   * @param {number} count - How many rows there are
   * @param {State} state - The state
   * @returns {Rows} The rows
   */
  #window(count, state) {
    const { end, start } = this.#range(count, state)
    /** @type {Row[]} */
    const rows = start > 0 ? [{ from: 0, kind: 'gap', to: start }] : []
    for (let position = start; position < end; position += 1) {
      rows.push({ kind: 'item', position })
    }
    const kept = new Set(state.facet(this.#list.keep)(state))
    for (const position of kept) {
      if ((position < start || position >= end) && position >= 0 && position < count) {
        rows.push({ kind: 'item', position })
      }
    }
    if (end < count) {
      rows.push({ from: end, kind: 'gap', to: count })
    }
    return rowsOf(rows)
  }

  /**
   * A row's attributes: which scrollable row it is placed in (a kept item outside the window in the top one, hidden but
   * present); a gap's size, in the scrollable rows it stands for; and, when only some rows render, each item's place
   * and the list's size. Rows are placed by their scrollable row, as `calc(row * pitch)`, rather than one after another,
   * so where a row is and where the scroll position is put are worked out the same way, and land exactly.
   * @param {RenderRow<T>} row - The row
   * @param {State} state - The state
   * @returns {Attributes} The attributes
   */
  #rowAttributes(row, state) {
    const count = this.#list.listOf(state).count()
    const { cap, offset, top } = state.field(this.field)
    if (row.kind === 'gap') {
      const first = Math.max(row.from, offset)
      const last = Math.min(row.to, offset + virtualRows(count, cap))
      return {
        style: `--interact-row: ${String(first - offset)}; --interact-gap-rows: ${String(Math.max(0, last - first))}`,
      }
    }
    const { end, start } = this.#range(count, state)
    const partial = end - start < count
    const offscreen = row.position < start || row.position >= end
    return {
      'aria-posinset': partial ? row.position + 1 : undefined,
      'aria-setsize': partial ? count : undefined,
      'data-offscreen': offscreen,
      style: `--interact-row: ${String((offscreen ? top : row.position) - offset)}`,
    }
  }

  /**
   * What windowing does in the page: following the person scrolling, measuring rows after a render, and putting the
   * scroll position where the top is. Moving the offset under the person keeps how far into the row they had
   * scrolled; anything else (a jump, a key) puts the top row exactly at the top, to the nearest whole pixel: browsers
   * keep scroll positions no finer (measured: WebKit 27.2 read 4,194,137.55 back as 4,194,137, Chrome 156 4,194,141.39
   * as 4,194,142), and a scroll event from where this put it is taken as its own.
   * @returns {Extension} The view plugin
   */
  #page() {
    return viewPlugin((store, root) => {
      /** How far into the top row the person scrolled, in pixels, and the top they scrolled to. */
      let within = 0
      /** @type {number | undefined} */
      let scrolledTo = undefined
      /**
       * Where this put the scroll position last, as the browser keeps it, and the top it put there: a scroll event
       * from there is this one's own, whatever row the browser's rounding seems to show.
       * @type {Readonly<{ at: number, top: number }> | undefined}
       */
      let placed = undefined
      /**
       * The person scrolling the list.
       * @param {Event} event - The scroll event
       * @returns {void}
       */
      const scroll = (event) => {
        const { target } = event
        const { offset, pitch, top } = store.state.field(this.field)
        const windowed = target instanceof HTMLElement && Object.hasOwn(target.dataset, 'windowed')
        if (!windowed || !inOwnView(root, target) || pitch === undefined) {
          return
        }
        if (placed?.top === top && Math.abs(target.scrollTop - placed.at) < 1) {
          return
        }
        const row = rowAt(target.scrollTop, pitch)
        within = target.scrollTop - row * pitch
        scrolledTo = offset + row
        if (scrolledTo !== top) {
          store.dispatch({ effects: this.scrolled.of(scrolledTo) })
        }
      }
      root.addEventListener('scroll', scroll, true)
      return {
        destroy: () => {
          root.removeEventListener('scroll', scroll, true)
        },
        rendered: () => {
          const scroller = ownElement(root, '[data-windowed]')
          if (scroller === undefined) {
            return
          }
          const placement = store.state.field(this.field)
          const first = scroller.querySelector(':scope > [data-position]:not([data-offscreen])')
          const measured = first === null ? undefined : measureRow(first)
          const cap = measured === undefined ? placement.cap : rowCap(measured.screen)
          if (measured !== undefined && (measured.pitch !== placement.pitch || cap !== placement.cap)) {
            store.dispatch({ effects: this.measured.of({ cap, pitch: measured.pitch }) })
            return
          }
          const { offset, pitch, top } = placement
          const ours = placed?.top === top && scroller.scrollTop === placed.at
          if (pitch === undefined || ours || rowAt(scroller.scrollTop, pitch) === top - offset) {
            return
          }
          within = top === scrolledTo ? within : 0
          scroller.scrollTop = Math.round((top - offset) * pitch + within)
          placed = { at: scroller.scrollTop, top }
        },
      }
    })
  }
}

/**
 * Windowing for a list.
 * @template T, R
 * @template {ItemSource<T>} S
 * @param {ListPipeline<T, R, S>} list - The list
 * @param {Readonly<{ rows?: number | undefined, top?: number | undefined, shrink?: boolean | undefined }>} [options] - How
 *   many rows show at once (10 by default), the position at the top at first, and whether a list with fewer items
 *   shows only as many rows as it has (by default it shows `rows` whatever it has)
 * @returns {Windowing<T, R, S>} The extension
 */
function windowing(list, options = {}) {
  return new Windowing(list, options.rows ?? DEFAULT_ROWS, options.top ?? 0, options.shrink ?? false)
}

export { Windowing, windowing }
