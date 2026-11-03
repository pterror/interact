/** @import { DomMode } from './css.js' */

import { setDefaultMode } from './component.js'
import { checkKind } from './css.js'

/**
 * A component class that can be registered: a custom element constructor that names its kind.
 * @typedef {CustomElementConstructor & { readonly kind: string }} ComponentClass
 */

/**
 * How to register: the prefix for every tag name, the DOM mode for instances that choose none, and the registry.
 * @typedef {Readonly<{ prefix: string, mode?: DomMode, registry?: CustomElementRegistry }>} Registration
 */

/**
 * Registers component classes as `<prefix>-<kind>` elements. Each is registered as a subclass of its own, so the same
 * class can be registered again under another prefix or in another registry.
 * @param {readonly ComponentClass[]} classes - The classes
 * @param {Registration} registration - How to register them
 * @returns {Map<string, string>} Each kind's tag name
 */
function register(classes, registration) {
  const { prefix, mode = 'shadow', registry = customElements } = registration
  checkKind(prefix)
  /** @type {Map<string, string>} */
  const names = new Map()
  for (const cls of classes) {
    const name = `${prefix}-${checkKind(cls.kind)}`
    const registered = class extends cls {}
    setDefaultMode(registered, mode)
    registry.define(name, registered)
    names.set(cls.kind, name)
  }
  return names
}

export { register }
