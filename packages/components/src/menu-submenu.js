/**
 * @import { Point } from '@interact/core/intent'
 * @import { Layer } from '@interact/core/layer'
 * @import { Wait } from './menu-types.js'
 */

import { insideArea } from '@interact/core'

/** How long the pointer rests on an entry before its submenu opens, as zag.js's menu waits. */
const OPEN_DELAY = 200

/**
 * What a menu's submenu slot needs of a submenu: its layer, and its changes.
 * @typedef {Readonly<{ layer: Layer, subscribe: (listener: () => void) => () => void }>} SubmenuLike
 */

/**
 * What a menu gives its submenu slot: how to wait, and what to do as a submenu changes, or closes by itself.
 * @typedef {Readonly<{ wait: Wait, changed: () => void, closed: () => void }>} SlotHost
 */

/**
 * The submenu open from one of a menu's entries, if any, and what the pointer is doing about it: one about to open
 * once the pointer has rested on its entry, and the area the pointer may cross on its way to the open one.
 * @template {SubmenuLike} M
 */
class SubmenuSlot {
  /** @type {Readonly<{ position: number, menu: M }> | undefined} */
  #open = undefined
  /** @type {(() => void) | undefined} */
  #unfollow = undefined
  /** @type {(() => void) | undefined} */
  #pending = undefined
  /** @type {readonly Point[] | undefined} */
  #heading = undefined
  /** @type {number | undefined} */
  #pointed = undefined
  /**
   * @readonly
   * @type {SlotHost}
   */
  #host

  /** @param {SlotHost} host - How to wait, and what to do as a submenu changes or closes */
  constructor(host) {
    this.#host = host
  }

  /** @returns {Readonly<{ position: number, menu: M }> | undefined} The submenu open, and its entry's position */
  get open() {
    return this.#open
  }

  /**
   * The submenu of an entry, made now unless it is the one open, any other closing.
   * @param {number} position - The entry's position
   * @param {() => M} make - Makes the submenu
   * @returns {M} The submenu
   */
  take(position, make) {
    this.cancel()
    if (this.#open?.position === position) {
      return this.#open.menu
    }
    this.close()
    const menu = make()
    const stops = [
      menu.subscribe(this.#host.changed),
      menu.layer.open.subscribe((open) => {
        this.#closedBy(menu, open)
      }),
    ]
    this.#unfollow = () => {
      for (const stop of stops) {
        stop()
      }
    }
    this.#open = { menu, position }
    return menu
  }

  /**
   * Closes and lets go of the submenu, if one is open, and stops one about to open.
   * @returns {void}
   */
  close() {
    const open = this.#open
    this.cancel()
    this.#heading = undefined
    this.#pointed = undefined
    this.#unfollow?.()
    this.#unfollow = undefined
    this.#open = undefined
    if (open !== undefined) {
      open.menu.layer.open.set(false)
      this.#host.changed()
    }
  }

  /**
   * The pointer came onto the entry at a position: any other submenu closes, and the entry's opens once the pointer
   * has rested there, unless something else happens first. Moving on over the same entry changes nothing.
   * @param {number} position - The entry's position
   * @param {boolean} opens - Whether the entry opens a submenu
   * @param {() => void} open - Opens it
   * @returns {void}
   */
  pointedAt(position, opens, open) {
    if (this.#pointed === position) {
      return
    }
    this.cancel()
    if (this.#open?.position !== position) {
      this.close()
    }
    this.#pointed = position
    if (opens && this.#open === undefined) {
      this.#pending = this.#host.wait(OPEN_DELAY, () => {
        this.#pending = undefined
        open()
      })
    }
  }

  /**
   * Stops a submenu about to open.
   * @returns {void}
   */
  cancel() {
    this.#pending?.()
    this.#pending = undefined
  }

  /**
   * The pointer left an entry toward the open submenu: while it stays inside `area`, crossing entries does nothing.
   * @param {readonly Point[]} area - Where it may pass (see `intentArea`)
   * @returns {void}
   */
  headFor(area) {
    this.#heading = area
  }

  /**
   * Whether the pointer, over the entry at a position, is only crossing it on its way to the open submenu. Once it
   * strays outside the area, it is no longer on its way.
   * @param {number} position - The entry under the pointer
   * @param {Point} pointer - Where the pointer is
   * @returns {boolean} Whether it is crossing
   */
  crossing(position, pointer) {
    const crossing =
      this.#heading !== undefined && this.#open?.position !== position && insideArea(pointer, this.#heading)
    if (!crossing) {
      this.#heading = undefined
    }
    return crossing
  }

  /**
   * The pointer reached the submenu: it is no longer on its way there, and no other is about to open.
   * @returns {void}
   */
  arrived() {
    this.#heading = undefined
    this.cancel()
  }

  /**
   * A submenu opened or closed: one that closed by itself (Escape, the arrow back) is let go, and its menu told.
   * @param {M} menu - The submenu
   * @param {boolean} open - Whether it is open
   * @returns {void}
   */
  #closedBy(menu, open) {
    if (!open && this.#open?.menu === menu) {
      this.close()
      this.#host.closed()
    }
  }
}

export { SubmenuSlot }
