/**
 * Draws any widget's view into the DOM, generically: each part is an element (a `button` for a button, else a `div`,
 * or the element the app makes for it), given its meaning and listeners by `page`, and drawn again, in place, on each
 * change.
 */

import { elementFor, identity, page, partName } from './web.js'

/** @import { Node as Part, Target } from './compose.js' */
/** @import { Key } from './contract.js' */
/** @import { Host } from './host.js' */
/** @import { PageOptions } from './web.js' */

/**
 * An element the app makes for a part: the element, which the part's meaning is applied to, and where its content
 * goes inside it
 * @typedef {Readonly<{ element: Element, slot: Element }>} Made
 */

/**
 * @typedef {PageOptions & Readonly<{
 *   container: Element,
 *   item: (key: Key) => string | globalThis.Node,
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
  const made = new Map()
  const running = page(options)

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
    const drawn = made.get(key) ?? create(node)
    made.set(key, drawn)
    const { element, slot } = drawn
    running.bind(key, element, node)
    const children = node.content.map((content, index) => {
      if ('target' in content) {
        return draw(content, seen)
      }
      const text = 'text' in content ? content.text : options.item(content.item)
      return typeof text === 'string' ? textAt(slot, index, text) : text
    })
    placeChildren(slot, children)
    return element
  }

  /**
   * Draws the whole tree again, letting go of parts no longer drawn
   * @returns {void}
   */
  const redraw = () => {
    /** @type {Set<string>} */
    const seen = new Set()
    const root = draw(running.host.tree(), seen)
    for (const key of made.keys()) {
      if (!seen.has(key)) {
        made.delete(key)
        running.unbind(key)
      }
    }
    if (container.firstChild !== root || container.lastChild !== running.live) {
      container.replaceChildren(root, running.live)
    }
  }

  redraw()
  const unwatch = running.host.watch(redraw)
  running.host.begin()

  return {
    host: running.host,
    stop: () => {
      unwatch()
      running.stop()
      container.replaceChildren()
    },
  }
}

export { renderDom }
