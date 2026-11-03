/**
 * Functions called with each value emitted.
 * @template T
 */
class Listeners {
  /**
   * @readonly
   * @type {Set<(value: T) => void>}
   */
  #all = new Set()

  /**
   * Calls `listener` with every value emitted from now on.
   * @param {(value: T) => void} listener - What to call
   * @returns {() => void} Stops calling it
   */
  add(listener) {
    this.#all.add(listener)
    return () => {
      this.#all.delete(listener)
    }
  }

  /**
   * Calls every listener with a value, in the order they were added.
   * @param {T} value - What to pass
   * @returns {void}
   */
  emit(value) {
    for (const listener of this.#all) {
      listener(value)
    }
  }
}

export { Listeners }
