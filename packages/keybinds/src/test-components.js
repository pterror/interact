/**
 * What the component tests share: reaching into a component's shadow DOM, typing into a field, and defining an
 * element under a name of the test's choosing, and making one.
 */

/**
 * A component's shadow root
 * @param {Element} element - The component
 * @returns {ShadowRoot} Its shadow root
 * @throws {TypeError} If it has none
 */
function shadowOf(element) {
  const root = element.shadowRoot
  if (root === null) {
    throw new TypeError(`${element.tagName} has no shadow root`)
  }
  return root
}

/**
 * The first element in a component's shadow DOM matching a selector, as the type it must be
 * @template {Element} E
 * @param {Element} element - The component
 * @param {string} selector - What to find
 * @param {new () => E} type - What it is
 * @returns {E} The element
 * @throws {TypeError} If it isn't there, or isn't that
 */
function partOf(element, selector, type) {
  const found = shadowOf(element).querySelector(selector)
  if (!(found instanceof type)) {
    throw new TypeError(`no ${selector} in ${element.tagName}`)
  }
  return found
}

/**
 * The text of every element in a component's shadow DOM matching a selector
 * @param {Element} element - The component
 * @param {string} selector - What to find
 * @returns {string[]} Their text, in order
 */
function textsOf(element, selector) {
  return Array.from(shadowOf(element).querySelectorAll(selector), (found) => found.textContent)
}

/**
 * The same, sorted
 * @param {Element} element - The component
 * @param {string} selector - What to find
 * @returns {string[]} Their text, in alphabetical order
 */
function sortedTextsOf(element, selector) {
  return textsOf(element, selector).toSorted((first, second) => first.localeCompare(second))
}

/**
 * Types into a field: sets its value and says so, as typing does
 * @param {HTMLInputElement} input - The field
 * @param {string} value - What it holds now
 * @returns {void}
 */
function typeInto(input, value) {
  input.value = value
  input.dispatchEvent(new Event('input'))
}

/**
 * Defines an element under a name unless something already is
 * @param {string} name - The name
 * @param {CustomElementConstructor} element - The class
 * @returns {void}
 */
function defineOnce(name, element) {
  if (customElements.get(name) === undefined) {
    customElements.define(name, element)
  }
}

/**
 * A component, defined under a name first if nothing is
 * @template {HTMLElement} E
 * @param {string} name - The name
 * @param {new () => E} component - The class
 * @returns {E} A new element of it
 * @throws {TypeError} If the name makes something else
 */
function elementOf(name, component) {
  defineOnce(name, component)
  const element = document.createElement(name)
  if (!(element instanceof component)) {
    throw new TypeError(`<${name}> isn't a ${component.name}`)
  }
  return element
}

export { defineOnce, elementOf, partOf, shadowOf, sortedTextsOf, textsOf, typeInto }
