/**
 * The context a CommandHub's `when` conditions see: the app's, with parts added over it.
 * @import { Context } from './command.js'
 */

/**
 * The app's context, and the parts laid over it, later ones over earlier.
 * @template {Context} C
 */
class HubContext {
  /**
   * @readonly
   * @type {() => C}
   */
  #base
  /** @type {readonly (() => Partial<C>)[]} */
  #parts = []

  /** @param {() => C} base - Gives the app's context */
  constructor(base) {
    this.#base = base
  }

  /**
   * Adds a part laid over the context.
   * @param {() => Partial<C>} get - Gives part of the context
   * @returns {() => void} A function that removes it again
   */
  add(get) {
    this.#parts = [...this.#parts, get]
    return () => {
      this.#parts = this.#parts.filter((each) => each !== get)
    }
  }

  /** @returns {C} The context now: the app's, with every part added laid over it, later ones over earlier */
  now() {
    const context = { ...this.#base() }
    for (const get of this.#parts) {
      Object.assign(context, get())
    }
    return context
  }
}

export { HubContext }
