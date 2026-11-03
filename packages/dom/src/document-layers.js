/**
 * @import { Layer } from '@interact/core/layer'
 * @import { LayerParts } from './inside-layer.js'
 */

import { LayerStack } from '@interact/core'

import { deepActiveElement } from './flat-tree.js'
import { happenedIn, onScrollbar } from './inside-layer.js'
import { tabWraps, tabbables } from './tabbable.js'

const FIRST = 0
const LAST = -1
const EVENTS = ['pointerdown', 'pointerup', 'pointercancel', 'click', 'focusin', 'keydown']

/**
 * One document's layers: the stack, what each layer is in the page, and the listeners that turn the person's presses,
 * focus moves and keys into dismissals. Escape and outside presses are heard in the capture phase, before anything
 * in the page sees them, so the layer they dismiss takes them.
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

  /**
   * Starts listening to a document.
   * @param {Document} document - The document
   */
  constructor(document) {
    this.#document = document
    for (const type of EVENTS) {
      document.addEventListener(type, this, true)
    }
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
   * Hears the person: presses, focus moving, Escape and Tab.
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
   * Escape dismisses the top layer, taking the key from the page; Tab stays inside the top modal layer. A key typed to
   * compose text (an input method) is the input method's.
   * @param {Event} event - The keydown
   * @returns {void}
   */
  #key(event) {
    if (!(event instanceof KeyboardEvent) || event.isComposing) {
      return
    }
    if (event.key === 'Escape' && this.stack.escape()) {
      event.preventDefault()
      event.stopPropagation()
    } else if (event.key === 'Tab') {
      this.#trap(event)
    }
  }

  /**
   * Keeps Tab inside the top modal layer, going round from the last element to the first and back.
   * @param {KeyboardEvent} event - The Tab keydown
   * @returns {void}
   */
  #trap(event) {
    const modal = this.stack.topModal()
    const parts = modal === undefined ? undefined : this.#parts.get(modal)
    if (parts === undefined) {
      return
    }
    const stops = tabbables(parts.element)
    if (tabWraps(stops, deepActiveElement(this.#document), event.shiftKey)) {
      event.preventDefault()
      const next = event.shiftKey ? stops.at(LAST) : stops.at(FIRST)
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

export { layersOf }
