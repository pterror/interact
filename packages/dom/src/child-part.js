/**
 * @import { Range } from './collect.js'
 * @import { Part, TemplateInstance } from './instance.js'
 * @import { Item } from './reconcile.js'
 * @import { Repeat, TemplateResult, Value } from './template.js'
 * @import { Child } from './values.js'
 */

import { adoptInstance, createInstance } from './instance.js'
import { clearRange } from './ranges.js'
import { adoptItems, reconcile } from './reconcile.js'
import { childOf } from './values.js'

/**
 * A child hole: whatever is between its markers is its content, and only it changes that content.
 */
class ChildPart {
  /** @readonly */
  #range
  #adopting
  /** @type {Child['kind']} */
  #kind = 'nothing'
  /** @type {Text | undefined} */
  #text
  /** @type {TemplateInstance | undefined} */
  #instance
  /** @type {Item[]} */
  #items = []

  /**
   * @param {Range} range - The hole's markers
   * @param {boolean} adopting - Whether what is between them is server markup to adopt on the first `set`
   */
  constructor(range, adopting) {
    this.#range = range
    this.#adopting = adopting
  }

  /**
   * Shows a value: text, a template, items by key, or nothing.
   * @param {Value} value - The hole's value
   * @returns {void}
   */
  set(value) {
    const child = childOf(value)
    if (this.#adopting) {
      this.#adopting = false
      this.#adopt(child)
    } else {
      this.#show(child)
    }
  }

  /**
   * Shows content, changing as little as it can.
   * @param {Child} child - The content
   * @returns {void}
   */
  #show(child) {
    if (child.kind === 'text') {
      this.#showText(child.text)
    } else if (child.kind === 'template') {
      this.#showTemplate(child)
    } else if (child.kind === 'repeat') {
      this.#showRepeat(child)
    } else {
      this.#clear()
    }
  }

  /**
   * Takes over server markup for content, keeping its nodes.
   * @param {Child} child - The content, as the server should have rendered it
   * @returns {void}
   */
  #adopt(child) {
    if (child.kind === 'template') {
      this.#instance = adoptInstance(child, this.#range, childParts)
      this.#kind = 'template'
    } else if (child.kind === 'repeat') {
      this.#items = adoptItems(child.entries, { childParts, range: this.#range })
      this.#kind = 'repeat'
    } else {
      this.#adoptText(child)
    }
  }

  /**
   * Takes over the server's text node when the content is text and the server rendered one, else renders afresh.
   * @param {Child} child - The content
   * @returns {void}
   */
  #adoptText(child) {
    const first = this.#range.open.nextSibling
    if (child.kind === 'text' && first instanceof Text && first.nextSibling === this.#range.close) {
      this.#text = first
      this.#kind = 'text'
      this.#showText(child.text)
    } else {
      clearRange(this.#range)
      this.#show(child)
    }
  }

  /**
   * Removes the content.
   * @returns {void}
   */
  #clear() {
    clearRange(this.#range)
    this.#kind = 'nothing'
    this.#text = undefined
    this.#instance = undefined
    this.#items = []
  }

  /**
   * Shows text, in the text node already there if there is one.
   * @param {string} text - The text
   * @returns {void}
   */
  #showText(text) {
    if (this.#kind === 'text' && this.#text) {
      if (this.#text.data !== text) {
        this.#text.data = text
      }
      return
    }
    this.#clear()
    this.#text = this.#range.close.ownerDocument.createTextNode(text)
    this.#range.close.before(this.#text)
    this.#kind = 'text'
  }

  /**
   * Shows a template: updates the one there if it is the same template, else renders it afresh.
   * @param {TemplateResult} result - The template and its values
   * @returns {void}
   */
  #showTemplate(result) {
    if (this.#kind === 'template' && this.#instance?.strings === result.strings) {
      this.#instance.update(result.values)
      return
    }
    this.#clear()
    const { instance, nodes } = createInstance(result, this.#range.close.ownerDocument, childParts)
    this.#range.close.before(nodes)
    this.#instance = instance
    this.#kind = 'template'
  }

  /**
   * Shows items by key.
   * @param {Repeat} repeat - The items
   * @returns {void}
   */
  #showRepeat(repeat) {
    if (this.#kind !== 'repeat') {
      this.#clear()
    }
    this.#items = reconcile(this.#items, repeat.entries, { childParts, range: this.#range })
    this.#kind = 'repeat'
  }
}

/**
 * The part for a child hole.
 * @param {Range} range - The hole's markers
 * @param {boolean} adopting - Whether what is between them is server markup
 * @returns {Part} The part
 */
function childParts(range, adopting) {
  return new ChildPart(range, adopting)
}

export { ChildPart }
