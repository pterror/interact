import { Listeners } from './listeners.js'

/**
 * A value that can be read and followed.
 * @template T
 * @typedef {Readonly<{ get: () => T, subscribe: (listener: (value: T) => void) => () => void }>} Observable
 */

/**
 * One piece of a component's state, owned either by the app (controlled) or by the component (uncontrolled). The
 * component asks for a change with `request`. Uncontrolled, the change is made at once. Controlled, nothing changes
 * until the app, having heard the request, sets the value with `set`.
 * @template T
 */
class Controllable {
  /** @type {T} */
  #value
  #controlled
  /**
   * @readonly
   * @type {Listeners<T>}
   */
  #changes = new Listeners()
  /**
   * @readonly
   * @type {Listeners<T>}
   */
  #requests = new Listeners()

  /**
   * @param {T} initial - The value to start with
   * @param {boolean} controlled - Whether the app owns the value
   */
  constructor(initial, controlled) {
    this.#value = initial
    this.#controlled = controlled
  }

  /**
   * Whether the app owns the value, so requests change nothing by themselves.
   * @returns {boolean} Whether it is controlled
   */
  get controlled() {
    return this.#controlled
  }

  /**
   * Hands the value to the app, or back to the component, as when an element learns after it was made that the app
   * owns a piece of its state.
   * @param {boolean} controlled - Whether the app owns the value
   * @returns {void}
   */
  control(controlled) {
    this.#controlled = controlled
  }

  /**
   * The value now.
   * @returns {T} The value
   */
  get() {
    return this.#value
  }

  /**
   * Sets the value, whoever owns it. Listeners hear of it only if it differs.
   * @param {T} next - The new value
   * @returns {void}
   */
  set(next) {
    if (Object.is(next, this.#value)) {
      return
    }
    this.#value = next
    this.#changes.emit(next)
  }

  /**
   * Asks for the value to change: the app hears every request, and an uncontrolled value changes at once.
   * @param {T} next - The value asked for
   * @returns {void}
   */
  request(next) {
    this.#requests.emit(next)
    if (!this.#controlled) {
      this.set(next)
    }
  }

  /**
   * Calls `listener` whenever the value changes.
   * @param {(value: T) => void} listener - Called with the new value
   * @returns {() => void} Stops calling it
   */
  subscribe(listener) {
    return this.#changes.add(listener)
  }

  /**
   * Calls `listener` with every change asked for, whether or not it is made.
   * @param {(value: T) => void} listener - Called with the value asked for
   * @returns {() => void} Stops calling it
   */
  onRequest(listener) {
    return this.#requests.add(listener)
  }
}

export { Controllable }
