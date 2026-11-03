/**
 * @import { Handler, Value } from './template.js'
 */

import { handlerOf } from './values.js'

/**
 * An event hole on an element. It listens once, and calls whichever handler it holds now.
 */
class EventPart {
  /** @readonly */
  #name
  /** @type {Handler | undefined} */
  #handler

  /**
   * @param {Element} element - The element
   * @param {string} name - The event
   */
  constructor(element, name) {
    this.#name = name
    element.addEventListener(name, (event) => {
      this.#handler?.(event)
    })
  }

  /**
   * Holds a new handler, or none.
   * @param {Value} value - The hole's value
   * @returns {void}
   */
  set(value) {
    this.#handler = handlerOf(value, this.#name)
  }
}

export { EventPart }
