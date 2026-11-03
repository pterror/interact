/** @import { Value } from './template.js' */

/**
 * A property hole on an element.
 */
class PropertyPart {
  /** @readonly */
  #element
  /** @readonly */
  #name
  #set = false
  /** @type {Value} */
  #value

  /**
   * @param {Element} element - The element
   * @param {string} name - The property, in its own case
   */
  constructor(element, name) {
    this.#element = element
    this.#name = name
  }

  /**
   * Sets the property, when the value differs from the last one set.
   * @param {Value} value - The hole's value
   * @returns {void}
   */
  set(value) {
    if (this.#set && Object.is(value, this.#value)) {
      return
    }
    this.#set = true
    this.#value = value
    Reflect.set(this.#element, this.#name, value)
  }
}

export { PropertyPart }
