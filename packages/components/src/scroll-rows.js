import { Controllable } from '@interact/core'

import { clamp } from './virtual-rows.js'

/**
 * Which rows of a list show: the position at the top and how many rows show at once, both controllable by the app. The
 * top is the source of truth for where the list is scrolled; a view turns it into pixels, never the other way round.
 */
class ScrollRows {
  /**
   * The position of the item showing at the top.
   * @readonly
   * @type {Controllable<number>}
   */
  top
  /**
   * How many rows show at once.
   * @readonly
   * @type {Controllable<number>}
   */
  rows
  /**
   * @readonly
   * @type {() => number}
   */
  #count
  /**
   * @readonly
   * @type {number}
   */
  #overscan

  /**
   * @param {Readonly<{ top: number, rows: number, overscan: number, count: () => number }>} start - The position at
   *   the top, how many rows show, how many to render beyond each edge, and how to count the items
   */
  constructor(start) {
    this.top = new Controllable(start.top, false)
    this.rows = new Controllable(start.rows, false)
    this.#overscan = start.overscan
    this.#count = start.count
  }

  /**
   * The positions from the first row rendered up to the one after the last: what shows, and the overscan either side.
   * @returns {Readonly<{ start: number, end: number }>} The range
   */
  window() {
    const top = this.top.get()
    return {
      end: Math.min(this.#count(), top + this.rows.get() + this.#overscan),
      start: Math.max(0, top - this.#overscan),
    }
  }

  /**
   * Asks to show `position` at the top, or as near as the end of the items allows.
   * @param {number} position - Where to scroll to
   * @returns {void}
   */
  scrollTo(position) {
    this.top.request(this.within(Math.floor(position)))
  }

  /**
   * Asks to scroll just far enough to show a position.
   * @param {number} position - Where it is
   * @returns {void}
   */
  reveal(position) {
    const top = this.top.get()
    if (position < top) {
      this.top.request(position)
    } else if (position >= top + this.rows.get()) {
      this.top.request(position - this.rows.get() + 1)
    }
  }

  /**
   * A position for the top, kept where the rows can show it: no further than shows the last item in the last row.
   * @param {number} position - The position wanted
   * @returns {number} The position kept inside
   */
  within(position) {
    return clamp(position, 0, Math.max(0, this.#count() - this.rows.get()))
  }

  /**
   * The positions to render: the window's, and the active item's when it is outside, so it can always be focused.
   * @param {number | undefined} active - The active item's position
   * @returns {number[]} The positions, the window's in order
   */
  positions(active) {
    const { end, start } = this.window()
    const positions = Array.from({ length: Math.max(0, end - start) }, (_skip, offset) => start + offset)
    if (active !== undefined && (active < start || active >= end)) {
      positions.push(active)
    }
    return positions
  }
}

export { ScrollRows }
