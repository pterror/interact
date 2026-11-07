/** @import { DismissReason, Layer } from './layer.js' */

import { Listeners } from './listeners.js'

/**
 * The open layers in the order they opened, the last on top. A press or focus outside a layer dismisses it, and every
 * layer above the one it was inside counts as outside; layers beneath the top modal layer can't be reached, so nothing
 * outside dismisses them. Escape dismisses only the top layer. A layer closing dismisses every layer above it.
 */
class LayerStack {
  /** @type {Layer[]} */
  #open = []
  /**
   * @readonly
   * @type {Map<Layer, () => void>}
   */
  #tracked = new Map()
  /**
   * @readonly
   * @type {Listeners<void>}
   */
  #changes = new Listeners()

  /**
   * Follows a layer's open state: while it is open it is in the stack, on top of what opened before it.
   * @param {Layer} layer - The layer
   * @returns {() => void} Stops following it, taking it out of the stack
   */
  track(layer) {
    const known = this.#tracked.get(layer)
    if (known) {
      return known
    }
    const stop = layer.open.subscribe((open) => {
      if (open) {
        this.#push(layer)
      } else {
        this.#remove(layer)
      }
    })
    /** @returns {void} */
    const untrack = () => {
      stop()
      this.#tracked.delete(layer)
      this.#remove(layer)
    }
    this.#tracked.set(layer, untrack)
    if (layer.open.get()) {
      this.#push(layer)
    }
    return untrack
  }

  /**
   * The open layers, bottom to top.
   * @returns {readonly Layer[]} The layers
   */
  layers() {
    return [...this.#open]
  }

  /**
   * The top layer, if any is open.
   * @returns {Layer | undefined} It
   */
  top() {
    return this.#open.at(-1)
  }

  /**
   * The top modal layer, if any is open: everything beneath it is unreachable.
   * @returns {Layer | undefined} It
   */
  topModal() {
    return this.#open.findLast((layer) => layer.modal)
  }

  /**
   * A press outside every layer above `inside` (or outside them all): dismisses those layers that close on it, from the
   * top down, leaving alone any beneath the top modal layer.
   * @param {Layer | undefined} inside - The highest layer the press was inside
   * @returns {void}
   */
  pressedOutside(inside) {
    this.#outside(inside, 'outside')
  }

  /**
   * Focus moving outside every layer above `inside` (or outside them all): as for a press, but modal layers keep focus,
   * so they are never dismissed this way.
   * @param {Layer | undefined} inside - The highest layer focus moved into
   * @returns {void}
   */
  focusedOutside(inside) {
    this.#outside(inside, 'focus-outside')
  }

  /**
   * Escape: dismisses the top layer, if it closes on Escape.
   * @returns {boolean} Whether a layer was dismissed, so the key was used
   */
  escape() {
    const top = this.top()
    if (top === undefined || !top.closes('escape')) {
      return false
    }
    top.dismiss('escape')
    return true
  }

  /**
   * Calls `listener` whenever a layer opens or closes.
   * @param {() => void} listener - What to call
   * @returns {() => void} Stops calling it
   */
  subscribe(listener) {
    return this.#changes.add(listener)
  }

  /**
   * Dismisses the layers above `inside` that close for `reason`, from the top down, none beneath the top modal layer.
   * @param {Layer | undefined} inside - The highest layer that wasn't outside
   * @param {DismissReason} reason - Why
   * @returns {void}
   */
  #outside(inside, reason) {
    const above = inside === undefined ? -1 : this.#open.indexOf(inside)
    const modal = this.topModal()
    const floor = Math.max(above + 1, modal === undefined ? -1 : this.#open.indexOf(modal))
    const outside = this.#open.slice(floor).toReversed()
    for (const layer of outside) {
      const skipsModal = reason === 'focus-outside' && layer.modal
      if (this.#open.includes(layer) && !skipsModal && layer.closes(reason)) {
        layer.dismiss(reason)
      }
    }
  }

  /**
   * Puts a layer on top.
   * @param {Layer} layer - The layer
   * @returns {void}
   */
  #push(layer) {
    this.#open = [...this.#open.filter((each) => each !== layer), layer]
    this.#changes.emit()
  }

  /**
   * Takes a layer out, and dismisses every layer above it, from the top down.
   * @param {Layer} layer - The layer
   * @returns {void}
   */
  #remove(layer) {
    const at = this.#open.indexOf(layer)
    if (at === -1) {
      return
    }
    const above = this.#open.slice(at + 1).toReversed()
    this.#open = this.#open.filter((each) => each !== layer)
    this.#changes.emit()
    for (const each of above) {
      if (this.#open.includes(each)) {
        each.dismiss('beneath')
      }
    }
  }
}

export { LayerStack }
