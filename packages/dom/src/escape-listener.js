/** @import { LayerStack } from '@interact/core/layer-stack' */

/**
 * Hears Escape once everything inside the page has: a control that has its own use for it (a combobox emptying its
 * field) takes it by preventing its default, and the top layer is dismissed only when nothing did.
 */
class EscapeListener {
  /**
   * @readonly
   * @type {LayerStack}
   */
  #stack

  /** @param {LayerStack} stack - The document's layers */
  constructor(stack) {
    this.#stack = stack
  }

  /**
   * Escape that nothing in the page took dismisses the top layer, and is then the layer's.
   * @param {Event} event - A keydown
   * @returns {void}
   */
  handleEvent(event) {
    if (
      event instanceof KeyboardEvent &&
      event.key === 'Escape' &&
      !event.isComposing &&
      !event.defaultPrevented &&
      this.#stack.escape()
    ) {
      event.preventDefault()
      event.stopPropagation()
    }
  }
}

export { EscapeListener }
