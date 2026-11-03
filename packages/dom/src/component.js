/**
 * @import { DomMode, Stylesheet } from './css.js'
 * @import { TemplateResult } from './template.js'
 */

import { adoptStyles } from './adopt.js'
import { KIND_ATTRIBUTE, checkKind } from './css.js'
import { hasServerMarkup, hydrate, render } from './render.js'

/**
 * What a component's behavior offers its view: a way to hear that its state changed.
 * @typedef {Readonly<{ subscribe: (listener: () => void) => () => void }>} Behavior
 */

/**
 * A component's default web view: its kind, its stylesheet, and what it renders for its behavior's state now. A view
 * that has to read layout or drive the page (a scroll position, say) also has `connect`, called with the root its view
 * is in once the first render or adoption is done; what it returns is called when the element leaves the page. Its own
 * subscriptions to the behavior hear each change after the view has rendered it.
 * @template {Behavior} B
 * @typedef {Readonly<{
 *   kind: string,
 *   styles: Stylesheet,
 *   render: (behavior: B) => TemplateResult,
 *   connect?: (behavior: B, root: HTMLElement | ShadowRoot) => () => void,
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

const FIRST = 0

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
 * Where an element's view goes: its shadow root in shadow DOM (made if the server didn't), else the element itself.
 * @param {HTMLElement} element - The element
 * @param {DomMode} mode - Where it lives
 * @returns {HTMLElement | ShadowRoot} Where its view goes
 */
function viewRoot(element, mode) {
  return mode === 'shadow' ? (element.shadowRoot ?? element.attachShadow({ mode: 'open' })) : element
}

/**
 * Styles an element, and renders its view or adopts the server's.
 * @template {Behavior} B
 * @param {HTMLElement | ShadowRoot} root - Where its view goes
 * @param {View<B>} view - The view
 * @param {Readonly<{ behavior: B, mode: DomMode }>} instance - Its behavior, and where it lives
 * @returns {void}
 */
function show(root, view, instance) {
  const styleRoot = root instanceof ShadowRoot ? root : root.getRootNode()
  if (styleRoot instanceof Document || styleRoot instanceof ShadowRoot) {
    adoptStyles(styleRoot, view.styles, { kind: view.kind, mode: instance.mode })
  }
  if (hasServerMarkup(root)) {
    hydrate(view.render(instance.behavior), root)
  } else {
    render(view.render(instance.behavior), root)
  }
}

/**
 * Renders a view again whenever its behavior's state changes, once per task however many changes there were.
 * @template {Behavior} B
 * @param {HTMLElement | ShadowRoot} root - Where the view is
 * @param {View<B>} view - The view
 * @param {B} behavior - The behavior
 * @returns {() => void} Stops
 */
function follow(root, view, behavior) {
  let pending = false
  return behavior.subscribe(() => {
    if (pending) {
      return
    }
    pending = true
    queueMicrotask(() => {
      pending = false
      render(view.render(behavior), root)
    })
  })
}

/**
 * Marks an element with its kind, styles it, renders its view or adopts the server's, and follows its behavior.
 * @template {Behavior} B
 * @param {HTMLElement} element - The element
 * @param {View<B>} view - Its view
 * @param {B} behavior - Its behavior
 * @returns {(() => void)[]} What stops following, and disconnects the view
 */
function start(element, view, behavior) {
  element.setAttribute(KIND_ATTRIBUTE, view.kind)
  const mode = elementMode(element)
  const root = viewRoot(element, mode)
  show(root, view, { behavior, mode })
  const stops = [follow(root, view, behavior)]
  if (view.connect) {
    stops.push(view.connect(behavior, root))
  }
  return stops
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
    /** @type {(() => void)[]} */
    #stops = []

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
      this.#stops = start(this, view, this.#behavior)
    }

    /**
     * Stops following the behavior, and disconnects the view.
     * @returns {void}
     */
    disconnectedCallback() {
      for (const stop of this.#stops.splice(FIRST)) {
        stop()
      }
    }
  }
}

export { MODE_ATTRIBUTE, component, setDefaultMode }
