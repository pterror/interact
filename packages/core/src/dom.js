/**
 * Draws any widget's view into the DOM, generically: each part is an element (a `button` for a button, else a `div`,
 * or the element the app makes for it), with what it means as attributes and a listener per input it takes. An event
 * goes to the innermost part listening for it; pointer events go to the part under the pointer, the pressed element
 * capturing the pointer so its release is never missed. `aria-modal` is carried out here: while a modal part is shown,
 * everything outside it is inert, and focus goes back where it was when it closes.
 */

import { host as run } from './host.js'
import { attributesOf, effectTarget, effectType, elementFor, identity, inputOf, partName } from './web.js'

/** @import { AnyWidget, Node as Part, Out, Target } from './compose.js' */
/** @import { Data, Key } from './contract.js' */
/** @import { Host } from './host.js' */
/** @import { Naming } from './web.js' */

/**
 * An element the app makes for a part: the element, which the part's meaning is applied to, and where its content
 * goes inside it
 * @typedef {Readonly<{ element: Element, slot: Element }>} Made
 */

/**
 * @typedef {Readonly<{
 *   container: Element,
 *   widget: AnyWidget,
 *   props: unknown,
 *   naming: Naming,
 *   item: (key: Key) => string | globalThis.Node,
 *   announce: (message: Readonly<{ [field: string]: Data }>) => string,
 *   effect: (out: Out, host: Host) => void,
 *   parts: Readonly<{ [name: string]: (target: Target) => Made }>,
 * }>} DomOptions
 */

/**
 * The element that should hold a child at an index: an existing text node is kept if it says the same
 * @param {Element} slot - The parent
 * @param {number} index - The index
 * @param {string} text - The text wanted there
 * @returns {globalThis.Node} The node
 */
function textAt(slot, index, text) {
  const existing = slot.childNodes[index]
  return existing instanceof Text && existing.data === text ? existing : document.createTextNode(text)
}

/**
 * Puts children into a parent in order, moving only what is out of place
 * @param {Element} slot - The parent
 * @param {readonly globalThis.Node[]} children - The children
 * @returns {void}
 */
function placeChildren(slot, children) {
  for (const [index, child] of children.entries()) {
    const there = slot.childNodes[index]
    if (there === undefined) {
      slot.append(child)
    } else if (there !== child) {
      there.before(child)
    }
  }
  while (slot.childNodes.length > children.length) {
    slot.lastChild?.remove()
  }
}

/**
 * Draws a widget into an element, and runs it
 * @param {DomOptions} options - Where, the widget and its props, how the host names and draws items and words
 *   announcements, what carries out the app's effects, and any parts the app makes itself
 * @returns {Readonly<{ host: Host, stop: () => void }>} The running widget, and stopping it
 */
function renderDom(options) {
  const { container, naming } = options
  /** @type {Map<string, Made>} */
  const elements = new Map()
  /** @type {WeakMap<Element, Part>} */
  const nodes = new WeakMap()
  /** @type {WeakMap<Element, Set<string>>} */
  const applied = new WeakMap()
  /** @type {WeakMap<Element, Set<string>>} */
  const listening = new WeakMap()
  /** @type {WeakSet<Event>} */
  const handled = new WeakSet()
  /** @type {Map<string, Readonly<{ restore: Element | null, inert: readonly Element[] }>>} */
  const modals = new Map()
  const live = document.createElement('div')
  live.setAttribute('role', 'status')

  /**
   * Carries out the effects the DOM has a way to: focus, reveal, announce. The rest are the app's
   * @param {Out} out - The effect
   * @param {Host} running - The running widget
   * @returns {void}
   */
  const effect = (out, running) => {
    const type = effectType(out)
    if (type === 'preventDefault') {
      return
    }
    if (type === 'focus' || type === 'reveal') {
      const target = effectTarget(out)
      const element = target === null ? undefined : elements.get(identity(target, naming))?.element
      if (element instanceof HTMLElement) {
        if (type === 'focus') {
          element.focus()
        } else {
          element.scrollIntoView({ block: 'nearest' })
        }
      }
      return
    }
    const { effect: made } = out
    if (type === 'announce' && typeof made === 'object' && made !== null && 'message' in made) {
      const { message } = made
      if (typeof message === 'object' && message !== null && !Array.isArray(message)) {
        live.textContent = options.announce(Object.fromEntries(Object.entries(message)))
      }
      return
    }
    options.effect(out, running)
  }

  const host = run({ effect, props: options.props, widget: options.widget })

  /**
   * The part an event is for: the part listening, or for a pointer event, the innermost part under the pointer that
   * takes it
   * @param {Event} event - The event
   * @param {Part} node - The part whose listener heard it
   * @returns {Part} The part
   */
  const targetOf = (event, node) => {
    if (!(event instanceof PointerEvent) || event.type === 'pointerdown') {
      return node
    }
    let under = document.elementFromPoint(event.clientX, event.clientY)
    while (under !== null) {
      const found = nodes.get(under)
      if (found?.listens.includes(event.type) === true) {
        return found
      }
      under = under.parentElement
    }
    return node
  }

  /**
   * A listener for one element
   * @param {Element} element - The element
   * @param {Event} event - What it heard
   * @returns {void}
   */
  const hear = (element, event) => {
    const node = nodes.get(element)
    if (node === undefined || !node.listens.includes(event.type) || handled.has(event)) {
      return
    }
    handled.add(event)
    if (event instanceof PointerEvent && event.type === 'pointerdown' && event.isTrusted) {
      element.setPointerCapture(event.pointerId)
    }
    const target = targetOf(event, node).target
    const outs = host.dispatch(target.owner, inputOf(event, target))
    if (outs.some((out) => effectType(out) === 'preventDefault')) {
      event.preventDefault()
    }
  }

  /**
   * Makes the element for a part
   * @param {Part} node - The part
   * @returns {Made} The element and where its content goes
   */
  const create = (node) => {
    const make = options.parts[partName(node.target)]
    if (make !== undefined) {
      return make(node.target)
    }
    const element = document.createElement(elementFor(node.role).tag)
    if (element instanceof HTMLButtonElement) {
      element.type = 'button'
    }
    return { element, slot: element }
  }

  /**
   * Draws a part and everything in it
   * @param {Part} node - The part
   * @param {Set<string>} seen - The parts drawn in this pass, by identity
   * @returns {Element} Its element
   */
  const draw = (node, seen) => {
    const key = identity(node.target, naming)
    seen.add(key)
    const made = elements.get(key) ?? create(node)
    elements.set(key, made)
    const { element, slot } = made
    nodes.set(element, node)
    const attributes = attributesOf(node, naming, elementFor(node.role).implicitRole)
    const before = applied.get(element) ?? new Set()
    for (const name of before) {
      if (!attributes.has(name)) {
        element.removeAttribute(name)
      }
    }
    for (const [name, value] of attributes) {
      if (value === null) {
        element.removeAttribute(name)
      } else if (element.getAttribute(name) !== value) {
        element.setAttribute(name, value)
      }
    }
    applied.set(element, new Set(attributes.keys()))
    const heard = listening.get(element) ?? new Set()
    for (const type of node.listens) {
      if (!heard.has(type)) {
        heard.add(type)
        element.addEventListener(type, (event) => {
          hear(element, event)
        })
      }
    }
    listening.set(element, heard)
    const children = node.content.map((content, index) => {
      if ('target' in content) {
        return draw(content, seen)
      }
      const text = 'text' in content ? content.text : options.item(content.item)
      return typeof text === 'string' ? textAt(slot, index, text) : text
    })
    placeChildren(slot, children)
    if (node.aria['modal'] === true) {
      modal(key, element, !node.hidden)
    }
    return element
  }

  /**
   * Makes everything outside a shown modal part inert, and puts back focus and the rest once it is hidden
   * @param {string} key - The part's identity
   * @param {Element} element - Its element
   * @param {boolean} shown - Whether it is shown
   * @returns {void}
   */
  const modal = (key, element, shown) => {
    const open = modals.get(key)
    if (shown && open === undefined) {
      /** @type {Element[]} */
      const inert = []
      for (let at = element; at.parentElement !== null && at !== document.body; at = at.parentElement) {
        for (const sibling of at.parentElement.children) {
          if (sibling !== at && sibling !== live && !sibling.hasAttribute('inert')) {
            sibling.setAttribute('inert', '')
            inert.push(sibling)
          }
        }
      }
      modals.set(key, { inert, restore: document.activeElement })
    } else if (!shown && open !== undefined) {
      modals.delete(key)
      for (const sibling of open.inert) {
        sibling.removeAttribute('inert')
      }
      const focused = document.activeElement
      if (
        open.restore instanceof HTMLElement &&
        (focused === null || focused === document.body || element.contains(focused))
      ) {
        open.restore.focus()
      }
    }
  }

  /**
   * Draws the whole tree again, dropping parts no longer drawn
   * @returns {void}
   */
  const redraw = () => {
    /** @type {Set<string>} */
    const seen = new Set()
    const root = draw(host.tree(), seen)
    for (const key of elements.keys()) {
      if (!seen.has(key)) {
        elements.delete(key)
      }
    }
    if (container.firstChild !== root || container.lastChild !== live) {
      container.replaceChildren(root, live)
    }
  }

  redraw()
  const unwatch = host.watch(redraw)
  host.begin()

  return {
    host,
    stop: () => {
      unwatch()
      host.stop()
      for (const [key] of modals) {
        const element = elements.get(key)?.element
        if (element !== undefined) {
          modal(key, element, false)
        }
      }
      container.replaceChildren()
    },
  }
}

export { renderDom }
