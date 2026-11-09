/**
 * Popovers as browsers have them and happy-dom doesn't, for the tests: showPopover and hidePopover, and `:popover-open`
 * matching an element shown.
 */

const SHOWN = 'data-test-popover-open'

/**
 * Shows a popover
 * @this {HTMLElement}
 * @returns {void}
 */
function showPopover() {
  this.setAttribute(SHOWN, '')
}

/**
 * Hides a popover
 * @this {HTMLElement}
 * @returns {void}
 */
function hidePopover() {
  this.removeAttribute(SHOWN)
}

/**
 * A method put on a prototype, as a class has it
 * @param {unknown} value - The method
 * @returns {PropertyDescriptor} Its descriptor
 */
function method(value) {
  return { configurable: true, enumerable: true, value, writable: true }
}

/**
 * Gives elements popovers until undone
 * @returns {() => void} Undoing it
 */
function fakePopovers() {
  const element = Object.getOwnPropertyDescriptors(Element.prototype)
  const html = Object.getOwnPropertyDescriptors(HTMLElement.prototype)
  const { matches } = element
  Object.defineProperties(Element.prototype, {
    matches: method(
      /**
       * @this {Element}
       * @param {string} selectors - The selectors
       * @returns {boolean} Whether the element matches them
       */
      function matchesShown(selectors) {
        return matches.value?.call(this, selectors.replaceAll(':popover-open', `[${SHOWN}]`)) ?? false
      },
    ),
  })
  Object.defineProperties(HTMLElement.prototype, { hidePopover: method(hidePopover), showPopover: method(showPopover) })
  return () => {
    Object.defineProperties(Element.prototype, { matches })
    for (const name of ['hidePopover', 'showPopover']) {
      const before = html[name]
      if (before === undefined) {
        Reflect.deleteProperty(HTMLElement.prototype, name)
      } else {
        Object.defineProperty(HTMLElement.prototype, name, before)
      }
    }
  }
}

export { fakePopovers }
