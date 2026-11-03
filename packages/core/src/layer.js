import { Controllable } from './controllable.js'
import { Listeners } from './listeners.js'

/**
 * Why a layer is being dismissed: Escape pressed while it was the top layer, a press outside it, focus moving outside
 * it, or a layer beneath it closing.
 * @typedef {'escape' | 'outside' | 'focus-outside' | 'beneath'} DismissReason
 */

/**
 * Which of the person's ways out dismiss a layer. A layer beneath one that closes is always dismissed.
 * @typedef {Readonly<{ escape: boolean, outside: boolean, focusOutside: boolean }>} Closers
 */

/**
 * How a layer is made: whether it starts open, whether the app owns its open state, whether it is modal (everything
 * else is unreachable while it is open), and which ways out close it.
 * @typedef {Readonly<{ open?: boolean, controlled?: boolean, modal?: boolean, closesOn?: Partial<Closers> }>} LayerOptions
 */

/** @type {Closers} */
const EVERY_WAY = { escape: true, focusOutside: true, outside: true }

/**
 * Something shown over the rest: a menu, a dialog, a popup. Whether it is open is a `Controllable`, so an app that owns
 * it hears every dismissal as a request it can refuse. A dismissal is first an event, with its reason, then a request
 * to close.
 *
 * `open` is whether it should show; `shown` is whether a view is showing it, as that view reports: true once it is on
 * screen, false once it has gone and focus is back where it was. What should happen only after it has gone (running a
 * command chosen in it, which may move focus) waits for `afterHidden`.
 */
class Layer {
  /** @readonly */
  open
  /**
   * Whether a view is showing the layer now, which only the view knows and sets.
   * @readonly
   */
  shown = new Controllable(false, false)
  /** @readonly */
  modal
  /**
   * @readonly
   * @type {Closers}
   */
  closesOn
  /**
   * @readonly
   * @type {Listeners<DismissReason>}
   */
  #dismissals = new Listeners()

  /**
   * @param {LayerOptions} [options] - How it is made
   */
  constructor(options = {}) {
    this.open = new Controllable(options.open ?? false, options.controlled ?? false)
    this.modal = options.modal ?? false
    this.closesOn = { ...EVERY_WAY, ...options.closesOn }
  }

  /**
   * Whether a way out closes this layer.
   * @param {DismissReason} reason - The way out
   * @returns {boolean} Whether it does
   */
  closes(reason) {
    if (reason === 'escape') {
      return this.closesOn.escape
    }
    if (reason === 'outside') {
      return this.closesOn.outside
    }
    return reason === 'beneath' || this.closesOn.focusOutside
  }

  /**
   * Dismisses the layer: tells whoever listens why, then asks to close. Left to the layer it closes at once; an app
   * that owns its open state decides.
   * @param {DismissReason} reason - Why
   * @returns {void}
   */
  dismiss(reason) {
    this.#dismissals.emit(reason)
    this.open.request(false)
  }

  /**
   * Calls `run` once no view shows the layer: at once if none does, otherwise once its view has hidden it and given
   * focus back.
   * @param {() => void} run - What to call
   * @returns {void}
   */
  afterHidden(run) {
    if (!this.shown.get()) {
      run()
      return
    }
    const stop = this.shown.subscribe((shown) => {
      if (!shown) {
        stop()
        run()
      }
    })
  }

  /**
   * Calls `listener` with the reason for every dismissal, before the request to close.
   * @param {(reason: DismissReason) => void} listener - Called with the reason
   * @returns {() => void} Stops calling it
   */
  onDismiss(listener) {
    return this.#dismissals.add(listener)
  }
}

export { Layer }
