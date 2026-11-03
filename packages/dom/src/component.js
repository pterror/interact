/**
 * @import { DomMode, Stylesheet } from './css.js'
 * @import { TemplateResult } from './template.js'
 */

import { adoptStyles } from './adopt.js'
import { KIND_ATTRIBUTE, VIEW_ATTRIBUTE, checkKind } from './css.js'
import { hasServerMarkup, hydrate, render } from './render.js'

/**
 * What a component's behavior offers its view: a way to hear that its state changed.
 * @typedef {Readonly<{ subscribe: (listener: () => void) => () => void }>} Behavior
 */

/**
 * A component's default web view: its kind, its stylesheet, and what it renders for its behavior's state now. A view
 * that has to read layout or drive the page (a scroll position, say) also has `rendered`, called with the root its view
 * is in after the first render or adoption and after every render since, and with `again`, which asks for one more
 * render, as when what it read changes what to render.
 * @template {Behavior} B
 * @typedef {Readonly<{
 *   kind: string,
 *   styles: Stylesheet,
 *   render: (behavior: B) => TemplateResult,
 *   rendered?: (behavior: B, root: HTMLElement, again: () => void) => void,
 * }>} View
 */

/**
 * An instance of a component class: an element with its behavior, and where it lives.
 * @template {Behavior} B
 * @typedef {HTMLElement & { readonly behavior: B, readonly mode: DomMode }} ComponentElement
 */

/**
 * A component class, as `component` makes it: what it constructs, its kind, and its view.
 * @template {Behavior} B
 * @typedef {{ new (): ComponentElement<B>, readonly kind: string, readonly view: View<B> }} ComponentClass
 */

/** The attribute that chooses an instance's DOM mode: `shadow` or `light`. */
const MODE_ATTRIBUTE = 'dom-mode'

/** @type {WeakMap<object, DomMode>} */
const defaultModes = new WeakMap()

/**
 * Sets the DOM mode for instances of a registered class that choose none themselves.
 * @param {object} registered - The class as registered
 * @param {DomMode} mode - The mode
 * @returns {void}
 */
function setDefaultMode(registered, mode) {
  defaultModes.set(registered, mode)
}

/**
 * The DOM mode an attribute asks for, if any.
 * @param {string | null} value - The attribute's value
 * @returns {DomMode | undefined} The mode
 */
function modeOf(value) {
  if (value === 'shadow' || value === 'light') {
    return value
  }
  if (value !== null) {
    throw new TypeError(`${MODE_ATTRIBUTE} is "shadow" or "light", not "${value}"`)
  }
  return undefined
}

/**
 * Where an element lives: shadow DOM if it has a shadow root, else what its `dom-mode` attribute asks for, else the
 * default its class was registered with.
 * @param {HTMLElement} element - The element
 * @returns {DomMode} The mode
 */
function elementMode(element) {
  if (element.shadowRoot) {
    return 'shadow'
  }
  return modeOf(element.getAttribute(MODE_ATTRIBUTE)) ?? defaultModes.get(element.constructor) ?? 'shadow'
}

/**
 * Where an element's view goes: in shadow DOM, the one element in its shadow root that the view is rendered in (made
 * if the server didn't), so its stylesheet can scope to it; else the element itself.
 * @param {HTMLElement} element - The element
 * @param {DomMode} mode - Where it lives
 * @returns {HTMLElement} Where its view goes
 */
function viewRoot(element, mode) {
  return mode === 'light' ? element : shadowView(element.shadowRoot ?? element.attachShadow({ mode: 'open' }))
}

/**
 * The element a shadow root's view is rendered in: the server's, or one made now.
 * @param {ShadowRoot} shadow - The shadow root
 * @returns {HTMLElement} The element
 */
function shadowView(shadow) {
  const found = [...shadow.children].find((child) => child.hasAttribute(VIEW_ATTRIBUTE))
  if (found instanceof HTMLElement) {
    return found
  }
  const made = document.createElement('div')
  made.setAttribute(VIEW_ATTRIBUTE, '')
  made.setAttribute('style', 'display: contents')
  shadow.append(made)
  return made
}

/**
 * Styles an element, and renders its view or adopts the server's.
 * @template {Behavior} B
 * @param {HTMLElement} root - Where its view goes
 * @param {View<B>} view - The view
 * @param {Readonly<{ behavior: B, mode: DomMode, again: () => void }>} instance - Its behavior, where it lives, and how
 *   to render it again
 * @returns {void}
 */
function show(root, view, instance) {
  const styleRoot = root.getRootNode()
  if (styleRoot instanceof Document || styleRoot instanceof ShadowRoot) {
    adoptStyles(styleRoot, view.styles, { kind: view.kind, mode: instance.mode })
  }
  if (hasServerMarkup(root)) {
    hydrate(view.render(instance.behavior), root)
  } else {
    render(view.render(instance.behavior), root)
  }
  view.rendered?.(instance.behavior, root, instance.again)
}

/**
 * A way to render a view again, once per task however many times it is asked.
 * @template {Behavior} B
 * @param {HTMLElement} root - Where the view is
 * @param {View<B>} view - The view
 * @param {B} behavior - The behavior
 * @returns {() => void} Asks for a render
 */
function scheduler(root, view, behavior) {
  let pending = false
  /** @returns {void} */
  function again() {
    if (pending) {
      return
    }
    pending = true
    queueMicrotask(() => {
      pending = false
      render(view.render(behavior), root)
      view.rendered?.(behavior, root, again)
    })
  }
  return again
}

/**
 * A custom element class joining a behavior to a web view. It defines no element: the app registers it, under a name
 * it chooses, with `register`. Each instance makes its own behavior, given the element, so an instance adopting server
 * markup can start in the state the server rendered. It renders its view into its shadow root or into itself, adopts
 * server markup when there is some, and renders again whenever the behavior's state changes, once per task however
 * many changes there were.
 * @template {Behavior} B
 * @param {View<B>} view - The default view
 * @param {(host: HTMLElement) => B} create - Makes an instance's behavior
 * @returns {ComponentClass<B>} The class
 */
function component(view, create) {
  checkKind(view.kind)
  return class extends HTMLElement {
    static kind = view.kind
    static view = view
    /** @readonly */
    #behavior = create(this)
    /** @type {(() => void) | undefined} */
    #stop = undefined

    /**
     * The instance's behavior: its methods, state and events.
     * @returns {B} The behavior
     */
    get behavior() {
      return this.#behavior
    }

    /**
     * Where the instance lives: shadow DOM if it has a shadow root (from the server, say), else what its `dom-mode`
     * attribute asks for, else the app's default when it registered the class.
     * @returns {DomMode} The mode
     */
    get mode() {
      return elementMode(this)
    }

    /**
     * Renders, or adopts server markup, and follows the behavior.
     * @returns {void}
     */
    connectedCallback() {
      this.setAttribute(KIND_ATTRIBUTE, view.kind)
      const { mode } = this
      const root = viewRoot(this, mode)
      const again = scheduler(root, view, this.#behavior)
      show(root, view, { again, behavior: this.#behavior, mode })
      this.#stop = this.#behavior.subscribe(again)
    }

    /**
     * Stops following the behavior.
     * @returns {void}
     */
    disconnectedCallback() {
      this.#stop?.()
    }
  }
}

export { MODE_ATTRIBUTE, component, setDefaultMode }
