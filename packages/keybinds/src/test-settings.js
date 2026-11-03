/**
 * What the settings panel's tests share: a panel in the page over a store, its parts by name, and keys and buttons
 * pressed in its window.
 */

/** @import { Schema } from './command.js' */

import { createComponent } from './create-component.js'
import { KeybindSettings } from './settings.js'
import { BindingsStore } from './store.js'
import { shadowOf } from './test-components.js'
import { ALL } from './test-inputs.js'

const FIRST = 0

/** @type {Element[]} */
const placed = []

/**
 * Takes every panel the test made out of the page
 * @returns {void}
 */
function removePanels() {
  for (const element of placed.splice(FIRST)) {
    element.remove()
  }
}

/**
 * Puts a panel in the page until the test ends
 * @param {Element} panel - The panel
 * @returns {void}
 */
function place(panel) {
  document.body.append(panel)
  placed.push(panel)
}

/**
 * An open panel in the page, over a store of a schema kept nowhere, showing every input
 * @template {Schema} T
 * @param {T} schema - The schema
 * @param {Readonly<{ holds?: boolean, releases?: boolean, sequences?: boolean }>} [syntax] - Which syntax is on
 * @returns {Readonly<{ panel: KeybindSettings, store: BindingsStore<T> }>} The panel, and its store
 */
function openPanel(schema, syntax = {}) {
  const panel = createComponent(KeybindSettings)
  panel.inputs = ALL.inputs
  panel.holds = syntax.holds === true
  panel.releases = syntax.releases === true
  panel.sequences = syntax.sequences === true
  const store = new BindingsStore(schema, { load: () => ({}), save: () => undefined })
  panel.store = store
  place(panel)
  panel.open = true
  return { panel, store }
}

/**
 * The elements in a panel with a part name
 * @param {Element} panel - The panel
 * @param {string} part - The part name
 * @returns {HTMLElement[]} The elements, in order
 */
function partsNamed(panel, part) {
  return [...shadowOf(panel).querySelectorAll(`[part~="${part}"]`)].filter((found) => found instanceof HTMLElement)
}

/**
 * Clicks the first element in a panel with a part name
 * @param {Element} panel - The panel
 * @param {string} part - The part name
 * @returns {void}
 * @throws {TypeError} If there's none
 */
function clickPart(panel, part) {
  const [found] = partsNamed(panel, part)
  if (found === undefined) {
    throw new TypeError(`no ${part} in the panel`)
  }
  found.click()
}

/**
 * A key going down or up in the window, as the recorders hear it
 * @param {string} type - keydown or keyup
 * @param {string} key - The key
 * @param {KeyboardEventInit} [init] - Modifiers
 * @returns {void}
 */
function keyInWindow(type, key, init = {}) {
  globalThis.dispatchEvent(new KeyboardEvent(type, { cancelable: true, code: `Key${key.toUpperCase()}`, key, ...init }))
}

/**
 * A key pressed and let go in the window
 * @param {string} key - The key
 * @returns {void}
 */
function tapInWindow(key) {
  keyInWindow('keydown', key)
  keyInWindow('keyup', key)
}

/**
 * A mouse button going down or up in the window
 * @param {string} type - mousedown or mouseup
 * @param {number} button - The button
 * @returns {void}
 */
function mouseInWindow(type, button) {
  globalThis.dispatchEvent(new MouseEvent(type, { button, cancelable: true }))
}

export { clickPart, keyInWindow, mouseInWindow, openPanel, partsNamed, removePanels, tapInWindow }
