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
 * render, as when what it read changes what to render. A view that took part of the page when rendered (an overlay in
 * its document's stack) also has `disconnected`, called when the element leaves the page.
 * @template {Behavior} B
 * @typedef {Readonly<{
 *   kind: string,
 *   styles: Stylesheet,
 *   render: (behavior: B) => TemplateResult,
 *   rendered?: (behavior: B, root: HTMLElement, again: () => void) => void,
 *   disconnected?: (behavior: B, root: HTMLElement) => void,
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
 * Where an element lives: shadow DOM if it has a shadow root, else what its `dom-mode` attribute asks for, else the
 * default its class was registered with.
 * @param {HTMLElement} element - The element
 * @returns {DomMode} The mode
 */
function elementMode(element) {
  if (element.shadowRoot) {
    return 'shadow'
  }
  const asked = element.getAttribute(MODE_ATTRIBUTE)
  if (asked === 'shadow' || asked === 'light') {
    return asked
  }
  if (asked !== null) {
    throw new TypeError(`${MODE_ATTRIBUTE} is "shadow" or "light", not "${asked}"`)
  }
  return defaultModes.get(element.constructor) ?? 'shadow'
}

/**
 * Where an element's view goes: in shadow DOM, the one element in its shadow root that the view is rendered in (the
 * server's, or one made now), so its stylesheet can scope to it; else the element itself.
 * @param {HTMLElement} element - The element
 * @param {DomMode} mode - Where it lives
 * @returns {HTMLElement} Where its view goes
 */
function viewRoot(element, mode) {
  if (mode === 'light') {
    return element
  }
  const shadow = element.shadowRoot ?? element.attachShadow({ mode: 'open' })
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
      if (!root.isConnected) {
        return
      }
      render(view.render(behavior), root)
      view.rendered?.(behavior, root, again)
    })
  }
  return again
}

/**
 * An element coming into the page: marked with its kind, styled, its view rendered or the server's adopted, and
 * following its behavior from then on.
 * @template {Behavior} B
 * @param {HTMLElement} element - The element
 * @param {View<B>} view - Its view
 * @param {B} behavior - Its behavior
 * @returns {Readonly<{ root: HTMLElement, stop: () => void }>} Where its view is, and how to stop following
 */
function connect(element, view, behavior) {
  element.setAttribute(KIND_ATTRIBUTE, view.kind)
  const mode = elementMode(element)
  const root = viewRoot(element, mode)
  const again = scheduler(root, view, behavior)
  const styleRoot = root.getRootNode()
  if (styleRoot instanceof Document || styleRoot instanceof ShadowRoot) {
    adoptStyles(styleRoot, view.styles, { kind: view.kind, mode })
  }
  if (hasServerMarkup(root)) {
    hydrate(view.render(behavior), root)
  } else {
    render(view.render(behavior), root)
  }
  view.rendered?.(behavior, root, again)
  return { root, stop: behavior.subscribe(again) }
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
    /** @type {Readonly<{ root: HTMLElement, stop: () => void }> | undefined} */
    #connected = undefined

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
      this.#connected = connect(this, view, this.#behavior)
    }

    /**
     * Stops following the behavior, and lets the view give back what it took of the page.
     * @returns {void}
     */
    disconnectedCallback() {
      this.#connected?.stop()
      if (this.#connected !== undefined) {
        view.disconnected?.(this.#behavior, this.#connected.root)
      }
    }
  }
}

export { MODE_ATTRIBUTE, component, setDefaultMode }
