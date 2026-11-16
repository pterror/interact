/**
 * Draws any widget's view into the DOM, generically: each part is an element (a `button` for a button, else a `div`,
 * or the element the app makes for it), given its meaning and listeners by `page`, and drawn again, in place, on each
 * change.
 */

import { elementFor, identity, itemText, page, partName, statesOf } from './web.js'

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
 * Where to draw (an element, or a shadow root), and what the page needs; optionally how the host draws an item (by
 * default its text in its source), the parts the app makes itself, by name (`option`), and whether each part's element names
 * itself and the states it shows in its `part` attribute, for styling from outside a shadow root (`::part(option
 * selected)`), and whether a part's text is the fallback of a slot named after the part, which the app can fill
 * @typedef {PageOptions & Readonly<{
 *   container: Element | ShadowRoot,
 *   exposeParts?: boolean,
 *   slotText?: boolean,
 *   item?: (key: Key) => string | globalThis.Node,
 *   parts?: Readonly<{ [name: string]: (target: Target) => Made }>,
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
  const { container, sources } = options
  const { item } = options
  /**
   * What an item is drawn as
   * @param {Readonly<{ item: Key, source: string }>} content - The item
   * @returns {string | globalThis.Node} Its text or node
   */
  const drawItem = (content) => (item === undefined ? itemText(content, sources) : item(content.item))
  const parts = options.parts ?? {}
  /** @type {Map<string, Made>} */
  const made = new Map()
  /** @type {Map<string, HTMLSlotElement>} */
  const slots = new Map()
  const live = document.createElement('div')
  live.setAttribute('role', 'status')
  const running = page(
    {
      ...options,
      name:
        options.name ??
        ((key) => {
          const drawn = item === undefined ? String(key) : item(key)
          return typeof drawn === 'string' ? drawn : (drawn.textContent ?? '')
        }),
    },
    () => live,
  )
  const { naming } = running

  /**
   * Makes the element for a part
   * @param {Part} node - The part
   * @returns {Made} The element and where its content goes
   */
  const create = (node) => {
    const make = parts[partName(node.target)]
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
    if (options.exposeParts === true) {
      element.setAttribute('part', [partName(node.target), ...statesOf(node)].join(' '))
    }
    const children = node.content.map((content, index) => {
      if ('target' in content) {
        return draw(content, seen)
      }
      if ('text' in content && options.slotText === true) {
        const named = slots.get(key) ?? document.createElement('slot')
        slots.set(key, named)
        named.setAttribute('name', partName(node.target))
        if (named.textContent !== content.text) {
          named.textContent = content.text
        }
        return named
      }
      const text = 'text' in content ? content.text : drawItem(content)
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
        slots.delete(key)
        running.unbind(key)
      }
    }
    if (container.firstChild !== root || container.lastChild !== live) {
      container.replaceChildren(root, live)
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
