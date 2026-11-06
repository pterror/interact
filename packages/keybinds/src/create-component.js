/**
 * Making a component from its class (KeybindCheatsheet, KeybindSettings, ...).
 *
 * A custom element name stays bound to the first class defined for it, so a second copy of the library on the same
 * page (a script loaded again after a deploy, two bundles) can't use the other copy's elements. Each copy gets its own
 * name: `keybinds-<kind>` when that's free or already this copy's, otherwise `keybinds-<kind>-2`, `-3`, ... Styles
 * select components by their `data-keybinds` kind, so the name doesn't matter to them.
 */

/**
 * A component class: an element with the kind it's named for
 * @typedef {CustomElementConstructor & Readonly<{ kind: string }>} ComponentClass
 */

const FIRST_COPY = 2
const NEXT = 1

/**
 * The name each class was registered under
 * @type {WeakMap<ComponentClass, string>}
 */
const NAMES = new WeakMap()

/**
 * The first name of the form `<usual>-<n>` that nothing is registered under
 * @param {string} usual - The usual name
 * @returns {string} The free name
 */
function freeCopyName(usual) {
  let copy = FIRST_COPY
  while (customElements.get(`${usual}-${copy}`) !== undefined) {
    copy += NEXT
  }
  return `${usual}-${copy}`
}

/**
 * Registers a class under its usual name, or under a name of its own when another class has that
 * @param {ComponentClass} component - The class
 * @returns {string} The name it's registered under
 */
function register(component) {
  const usual = `keybinds-${component.kind}`
  const existing = customElements.get(usual)
  if (existing === undefined) {
    customElements.define(usual, component)
    return usual
  }
  if (existing === component) {
    return usual
  }
  const name = freeCopyName(usual)
  customElements.define(name, class extends component {})
  return name
}

/**
 * Makes a component from its class, registering the class the first time
 * @template {HTMLElement} E
 * @param {(new () => E) & ComponentClass} component - The class
 * @returns {E} A new element of that class
 * @throws {TypeError} If the name it's registered under makes something else
 */
function createComponent(component) {
  let name = NAMES.get(component)
  if (name === undefined) {
    name = register(component)
    NAMES.set(component, name)
  }
  const element = document.createElement(name)
  if (!(element instanceof component)) {
    throw new TypeError(`<${name}> isn't a ${component.name}`)
  }
  return element
}

export { createComponent }
