/**
 * @import { Layer } from '@interact/core/layer'
 */

import { LayerStack } from '@interact/core'

import { deepActiveElement } from './flat-tree.js'
import { tabWraps, tabbables } from './tabbable.js'

/**
 * What a layer is in the page: the element shown, and the element it is anchored to, if any, which counts as inside
 * it (pressing a menu's button is pressing the menu's own control, not outside it).
 * @typedef {Readonly<{ element: HTMLElement, anchor: () => Element | undefined }>} LayerParts
 */

const EVENTS = ['pointerdown', 'pointerup', 'pointercancel', 'click', 'focusin', 'focusout', 'keydown']

/**
 * Whether an event's path passes through a node.
 * @param {readonly EventTarget[]} path - The event's composed path
 * @param {Element | undefined} node - The node
 * @returns {boolean} Whether it does
 */
function passesThrough(path, node) {
  return node !== undefined && path.includes(node)
}

/**
 * Whether a press on a modal dialog was on its backdrop: the dialog is the target, but the point is outside its box.
 * @param {Event} event - The press
 * @param {HTMLElement} element - The layer's element
 * @returns {boolean} Whether it was
 */
function onBackdrop(event, element) {
  const target = event.composedPath().at(0)
  if (!(element instanceof HTMLDialogElement) || !(event instanceof MouseEvent) || target !== element) {
    return false
  }
  const box = element.getBoundingClientRect()
  const { clientX: across, clientY: down } = event
  return across < box.left || across > box.right || down < box.top || down > box.bottom
}

/**
 * Whether a press was on a scrollbar of the element it targets, which is scrolling, not pressing outside: inside the
 * element's box, beyond its client area. A scrollbar that takes no room (an overlay scrollbar) leaves no such place.
 * @param {Event} event - The press
 * @returns {boolean} Whether it was
 */
function onScrollbar(event) {
  const target = event.composedPath().at(0)
  if (!(event instanceof MouseEvent) || !(target instanceof Element)) {
    return false
  }
  const root = target === target.ownerDocument.documentElement
  const box = target.getBoundingClientRect()
  const across = event.clientX - (root ? 0 : box.left + target.clientLeft)
  const down = event.clientY - (root ? 0 : box.top + target.clientTop)
  const scrolls = target.scrollHeight > target.clientHeight || target.scrollWidth > target.clientWidth
  const within = root || (across < box.width - target.clientLeft && down < box.height - target.clientTop)
  return scrolls && within && (across >= target.clientWidth || down >= target.clientHeight)
}

/**
 * Whether an event happened inside a layer: in its element, unless on a modal dialog's backdrop, or in its anchor.
 * Shadow roots and slots don't hide it: the event's composed path goes through them.
 * @param {Event} event - The event
 * @param {LayerParts} parts - The layer's parts
 * @returns {boolean} Whether it did
 */
function happenedIn(event, parts) {
  const path = event.composedPath()
  const inElement = passesThrough(path, parts.element) && !onBackdrop(event, parts.element)
  return inElement || passesThrough(path, parts.anchor())
}

/**
 * Hears Escape once everything inside the page has: a control that has its own use for it (a combobox emptying its
 * field) takes it by preventing its default, and the top layer is dismissed only when nothing did.
 */
class EscapeListener {
  /**
   * @readonly
   * @type {LayerStack}
   */
  #stack

  /** @param {LayerStack} stack - The document's layers */
  constructor(stack) {
    this.#stack = stack
  }

  /**
   * Escape that nothing in the page took dismisses the top layer, and is then the layer's.
   * @param {Event} event - A keydown
   * @returns {void}
   */
  handleEvent(event) {
    if (
      event instanceof KeyboardEvent &&
      event.key === 'Escape' &&
      !event.isComposing &&
      !event.defaultPrevented &&
      this.#stack.escape()
    ) {
      event.preventDefault()
      event.stopPropagation()
    }
  }
}

/**
 * One document's layers: the stack, what each layer is in the page, and the listeners that turn the person's presses,
 * focus moves and keys into dismissals. Outside presses and Tab are heard in the capture phase, before anything in the
 * page sees them; Escape after everything inside the page has, so a control that uses it gets it first.
 */
class DocumentLayers {
  /** @readonly */
  stack = new LayerStack()
  /**
   * @readonly
   * @type {Map<Layer, LayerParts>}
   */
  #parts = new Map()
  /** @readonly */
  #document
  /**
   * The press going on, while the pointer is down over open layers.
   * @type {PromiseWithResolvers<void> | undefined}
   */
  #press = undefined
  #touchPending = false
  /** Whether a Tab is moving focus now: set by its keydown, cleared once the task it moves focus in is over. */
  #tabbing = false

  /**
   * Starts listening to a document.
   * @param {Document} document - The document
   */
  constructor(document) {
    this.#document = document
    for (const type of EVENTS) {
      document.addEventListener(type, this, true)
    }
    document.addEventListener('keydown', new EscapeListener(this.stack))
  }

  /**
   * Follows a layer: while it is open it is in the stack, and its parts decide what counts as inside it.
   * @param {Layer} layer - The layer
   * @param {LayerParts} parts - Its element and anchor
   * @returns {() => void} Stops following it
   */
  add(layer, parts) {
    this.#parts.set(layer, parts)
    const untrack = this.stack.track(layer)
    return () => {
      untrack()
      this.#parts.delete(layer)
    }
  }

  /**
   * What a layer is in the page.
   * @param {Layer} layer - The layer
   * @returns {LayerParts | undefined} Its parts, if it is followed
   */
  partsOf(layer) {
    return this.#parts.get(layer)
  }

  /**
   * Every followed layer's parts.
   * @returns {readonly LayerParts[]} The parts
   */
  allParts() {
    return [...this.#parts.values()]
  }

  /**
   * Waits for the press going on now to end, so what the press does by itself (focus moving to where it landed) has
   * happened; nothing to wait for if there is none.
   * @returns {Promise<void>} When it has ended
   */
  async pressEnded() {
    await this.#press?.promise
  }

  /**
   * Hears the person: presses, focus moving, Escape and Tab. While no layer is open, only the end of a press.
   * @param {Event} event - What happened
   * @returns {void}
   */
  handleEvent(event) {
    if (event.type === 'pointerup' || event.type === 'pointercancel') {
      this.#press?.resolve()
      this.#press = undefined
      return
    }
    if (this.stack.top() === undefined) {
      return
    }
    if (event.type === 'keydown') {
      this.#key(event)
    } else if (event.type === 'focusin') {
      this.#focused(event)
    } else if (event.type === 'focusout') {
      this.#blurred(event)
    } else {
      this.#pointer(event)
    }
  }

  /**
   * A press. A touch is a press only once it becomes a click, so a finger scrolling the page dismisses nothing.
   * @param {Event} event - The pointerdown or click
   * @returns {void}
   */
  #pointer(event) {
    if (event.type === 'pointerdown') {
      this.#press ??= Promise.withResolvers()
      const touch = event instanceof PointerEvent && event.pointerType === 'touch'
      this.#touchPending = touch
      if (!touch) {
        this.#pressed(event)
      }
    } else if (this.#touchPending) {
      this.#touchPending = false
      this.#pressed(event)
    }
  }

  /**
   * A press: dismisses the layers it was outside of, unless it was on a scrollbar.
   * @param {Event} event - The press
   * @returns {void}
   */
  #pressed(event) {
    if (!onScrollbar(event)) {
      this.stack.pressedOutside(this.#inside(event))
    }
  }

  /**
   * Focus moving: dismisses the layers it moved outside of. While the pointer is down, the press decides instead.
   * @param {Event} event - The focusin
   * @returns {void}
   */
  #focused(event) {
    if (this.#press === undefined) {
      this.stack.focusedOutside(this.#inside(event))
    }
  }

  /**
   * Focus leaving the page: a Tab that takes focus out of the document, past its last element, moves it nowhere in it,
   * so no focusin follows. That is focus moving outside every layer. Focus leaving because the window does (another
   * window or tab taking it) is not, so only a Tab counts.
   * @param {Event} event - The focusout
   * @returns {void}
   */
  #blurred(event) {
    if (this.#tabbing && this.#press === undefined && event instanceof FocusEvent && event.relatedTarget === null) {
      this.stack.focusedOutside(undefined)
    }
  }

  /**
   * Tab: notes that it is moving focus, until the task it does that in is over, and keeps it inside the top modal
   * layer, going round from the last element to the first and back. A key typed to compose text (an input method) is
   * the input method's.
   * @param {Event} event - The keydown
   * @returns {void}
   */
  #key(event) {
    if (!(event instanceof KeyboardEvent) || event.isComposing || event.key !== 'Tab') {
      return
    }
    this.#tabbing = true
    setTimeout(() => {
      this.#tabbing = false
    }, 0)
    const modal = this.stack.topModal()
    const parts = modal === undefined ? undefined : this.#parts.get(modal)
    if (parts === undefined) {
      return
    }
    const stops = tabbables(parts.element)
    if (tabWraps(stops, deepActiveElement(this.#document), event.shiftKey)) {
      event.preventDefault()
      const next = event.shiftKey ? stops.at(-1) : stops.at(0)
      next?.focus()
    }
  }

  /**
   * The highest open layer an event happened inside.
   * @param {Event} event - The event
   * @returns {Layer | undefined} The layer, if it was inside one
   */
  #inside(event) {
    return this.stack
      .layers()
      .toReversed()
      .find((layer) => {
        const parts = this.#parts.get(layer)
        return parts !== undefined && happenedIn(event, parts)
      })
  }
}

/** @type {WeakMap<Document, DocumentLayers>} */
const documents = new WeakMap()

/**
 * A document's layers, listening from the first time they are asked for.
 * @param {Document} document - The document
 * @returns {DocumentLayers} Its layers
 */
function layersOf(document) {
  const known = documents.get(document)
  if (known) {
    return known
  }
  const fresh = new DocumentLayers(document)
  documents.set(document, fresh)
  return fresh
}

export { EscapeListener, happenedIn, layersOf, onScrollbar }
