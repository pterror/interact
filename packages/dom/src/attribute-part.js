/** @import { Value } from './template.js' */

import { attributeText } from './values.js'

/**
 * An attribute hole on an element.
 */
class AttributePart {
  /** @readonly */
  #element
  /** @readonly */
  #name
  /** @type {string | undefined} */
  #text

  /**
   * Starts from what the element has, so adopting server markup changes nothing that is already right.
   * @param {Element} element - The element
   * @param {string} name - The attribute
   */
  constructor(element, name) {
    this.#element = element
    this.#name = name
    this.#text = element.getAttribute(name) ?? undefined
  }

  /**
   * Sets or removes the attribute, when its text changes.
   * @param {Value} value - The hole's value
   * @returns {void}
   */
  set(value) {
    const text = attributeText(value, this.#name)
    if (text === this.#text) {
      return
    }
    this.#text = text
    if (text === undefined) {
      this.#element.removeAttribute(this.#name)
    } else {
      this.#element.setAttribute(this.#name, text)
    }
  }
}

export { AttributePart }
