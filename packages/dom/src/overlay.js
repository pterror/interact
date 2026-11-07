/**
 * @import { Layer } from '@interact/core/layer'
 * @import { Anchor, Following, Placement } from './anchored.js'
 */

import { follow, position, unposition } from './anchored.js'
import { layersOf } from './document-layers.js'
import { deepActiveElement, flatContains } from './flat-tree.js'
import { tabbables } from './tabbable.js'

/**
 * How an overlay behaves in the page.
 *
 * - `anchor`: what it is placed against, an element in any tree or a point. Without one its stylesheet places it (a
 *   dialog in the middle of the screen, say).
 * - `placement`: the side and alignment it prefers, and the gap and margin, over the defaults (below, lined up at the
 *   start, 4px from the anchor and 8px from the screen's edges).
 * - `focus`: `move` takes focus into it when it opens and gives it back when it closes, unless something else took it
 *   meanwhile; `stay` leaves focus where it is (a combobox's popup, whose input keeps focus).
 * - `initialFocus`: where focus goes in, for `move`; by default the first Tab stop, else the overlay itself.
 * @typedef {Readonly<{
 *   anchor?: Anchor,
 *   placement?: Partial<Placement>,
 *   focus?: 'move' | 'stay',
 *   initialFocus?: (overlay: HTMLElement) => HTMLElement | undefined,
 * }>} OverlayOptions
 */

/** @type {Placement} */
const DEFAULT_PLACEMENT = { align: 'start', gap: 4, margin: 8, side: 'block-end' }
/** @type {WeakMap<HTMLElement, BoundOverlay>} */
const bound = new WeakMap()

/**
 * Where focus can go back to: the element focus came from, if it can still take it; if it is inside an overlay that
 * closed, where that overlay's focus came from; otherwise nowhere.
 * @param {Element | undefined} target - Where focus came from
 * @param {Document} document - The document
 * @returns {HTMLElement | undefined} Where it can go back to
 */
function usableReturn(target, document) {
  if (target === undefined || !target.isConnected) {
    return undefined
  }
  if (target instanceof HTMLElement && target.checkVisibility()) {
    return target
  }
  const holder = layersOf(document)
    .allParts()
    .find((parts) => flatContains(parts.element, target))
  return holder === undefined ? undefined : usableReturn(bound.get(holder.element)?.returnTo, document)
}

/**
 * Gives focus back to where it came from once an overlay has hidden, if hiding lost it: it is nowhere, on the page
 * itself, or still inside the overlay. Hidden by a press, it waits for the press to end: a press on something that
 * takes focus gives it focus, and only a press on nothing loses it.
 * @param {HTMLElement} element - The overlay, hidden
 * @param {Element} returnTo - Where focus came from when it showed
 * @returns {Promise<void>} When focus is back, or stays where it is
 */
async function giveFocusBack(element, returnTo) {
  const document = element.ownerDocument
  await layersOf(document).pressEnded()
  const active = deepActiveElement(document)
  if (active === undefined || active === document.body || flatContains(element, active)) {
    usableReturn(returnTo, document)?.focus({ preventScroll: true })
  }
}

/**
 * Whether an overlay is showing: a dialog open, or a popover open.
 * @param {HTMLElement} element - The overlay
 * @returns {boolean} Whether it is
 */
function isShown(element) {
  return element instanceof HTMLDialogElement ? element.open : element.matches(':popover-open')
}

/**
 * Fails unless an element can be shown as its layer needs: a modal layer as a dialog, so everything else becomes
 * unreachable; any other as a manual popover, so it shows above everything without the browser dismissing it.
 * @param {HTMLElement} element - The overlay
 * @param {Layer} layer - Its layer
 * @returns {void}
 */
function checkElement(element, layer) {
  if (layer.modal && !(element instanceof HTMLDialogElement)) {
    throw new TypeError('A modal overlay is a <dialog closedby="none">, so the rest of the page becomes unreachable')
  }
  if (!layer.modal && element.getAttribute('popover') !== 'manual') {
    throw new TypeError('An overlay that is not modal is an element with popover="manual"')
  }
}

/**
 * Fails if an open modal layer beneath this one would make it unreachable: everything outside the top modal dialog
 * is inert, so an overlay above it has to be inside it.
 * @param {HTMLElement} element - The overlay about to show
 * @param {Layer} layer - Its layer
 * @returns {void}
 */
function checkReachable(element, layer) {
  const layers = layersOf(element.ownerDocument)
  const modal = layers.stack.topModal()
  const modalElement = modal === undefined || modal === layer ? undefined : layers.partsOf(modal)?.element
  if (modalElement !== undefined && !flatContains(modalElement, element)) {
    throw new Error('An overlay opened over a modal one has to be inside it, or nothing in it can be reached')
  }
}

/**
 * The placement an overlay's options ask for, over the defaults.
 * @param {OverlayOptions} options - The options
 * @returns {Placement} The placement
 */
function placementOf(options) {
  return { ...DEFAULT_PLACEMENT, ...options.placement }
}

/**
 * An overlay element bound to its layer, for as long as it is in the page: the options it was last synced with, where
 * focus came from when it showed, and what keeps it placed.
 */
class BoundOverlay {
  /** @readonly */
  element
  /** @readonly */
  layer
  /** @type {OverlayOptions} */
  options
  /** @type {Element | undefined} */
  returnTo = undefined
  /** @readonly */
  #release
  /** @type {Following | undefined} */
  #following = undefined

  /**
   * Binds an overlay element to its layer, putting the layer in its document's stack.
   * @param {HTMLElement} element - The overlay
   * @param {Layer} layer - Its layer
   * @param {OverlayOptions} options - How it behaves
   */
  constructor(element, layer, options) {
    checkElement(element, layer)
    this.element = element
    this.layer = layer
    this.options = options
    this.#release = layersOf(element.ownerDocument).add(layer, {
      anchor: () => (this.options.anchor instanceof Element ? this.options.anchor : undefined),
      element,
    })
  }

  /**
   * Shows the overlay: in the top layer, placed against its anchor, with focus taken into it if it moves focus: where
   * its options say, or its first Tab stop, or the overlay itself.
   * @returns {void}
   */
  show() {
    const { element, options } = this
    checkReachable(element, this.layer)
    this.returnTo = options.focus === 'stay' ? undefined : deepActiveElement(element.ownerDocument)
    if (element instanceof HTMLDialogElement) {
      element.showModal()
    } else {
      element.showPopover()
    }
    this.place()
    if (options.focus !== 'stay') {
      const target = options.initialFocus?.(element) ?? tabbables(element).at(0) ?? element
      target.focus({ preventScroll: true })
    }
    this.layer.shown.set(true)
  }

  /**
   * Places the overlay against its anchor, if it has one, and keeps it placed.
   * @returns {void}
   */
  place() {
    const { anchor } = this.options
    if (anchor === undefined) {
      return
    }
    position(this.element, anchor, placementOf(this.options))
    this.#following ??= follow(
      this.element,
      () => this.options.anchor,
      () => placementOf(this.options),
    )
  }

  /**
   * Hides the overlay, and gives focus back to where it came from if hiding lost it; its layer is no longer shown once
   * focus is back.
   * @returns {void}
   */
  hide() {
    const { element, returnTo } = this
    this.#unplace()
    if (element instanceof HTMLDialogElement) {
      element.close()
    } else {
      element.hidePopover()
    }
    this.returnTo = undefined
    void this.#gone(returnTo)
  }

  /**
   * Once the overlay has hidden: gives focus back if it came from somewhere, then says its layer is no longer shown.
   * @param {Element | undefined} returnTo - Where focus came from when it showed
   * @returns {Promise<void>} When both are done
   */
  async #gone(returnTo) {
    if (returnTo !== undefined) {
      await giveFocusBack(this.element, returnTo)
    }
    this.layer.shown.set(false)
  }

  /**
   * Hides the overlay if it shows, and takes its layer out of its document's stack.
   * @returns {void}
   */
  release() {
    if (isShown(this.element)) {
      this.hide()
    } else {
      this.#unplace()
    }
    this.#release()
  }

  /**
   * Stops keeping the overlay placed, and takes its placement off.
   * @returns {void}
   */
  #unplace() {
    this.#following?.stop()
    this.#following = undefined
    unposition(this.element)
  }
}

/**
 * Brings an overlay element in line with its layer, after every render of the view it is in: shows it when its layer
 * is open and it isn't showing, hides it when its layer is closed, and places it again while it shows. The first call
 * puts the layer in its document's stack, where Escape, presses and focus outside dismiss it. The view has to render
 * again when the layer opens or closes, so its behavior's `subscribe` reports those changes.
 * @param {HTMLElement} element - The overlay: a `<dialog closedby="none">` for a modal layer, else an element with
 *   `popover="manual"`. Its `style` attribute and `data-side` and `data-anchored` attributes are the overlay's own
 * @param {Layer} layer - Its layer
 * @param {OverlayOptions} [options] - How it behaves
 * @returns {void}
 */
function syncOverlay(element, layer, options = {}) {
  let binding = bound.get(element)
  if (binding === undefined) {
    binding = new BoundOverlay(element, layer, options)
    bound.set(element, binding)
  } else if (binding.layer === layer) {
    binding.options = options
  } else {
    throw new Error('An overlay element is bound to one layer for as long as it is in the page')
  }
  const open = layer.open.get()
  const shown = isShown(element)
  if (open && !shown) {
    binding.show()
  } else if (!open && shown) {
    binding.hide()
  } else if (open) {
    binding.place()
  }
}

/**
 * Lets an overlay element go, when the view it is in leaves the page: it hides, and its layer leaves the stack. Its
 * layer stays open, so the overlay shows again if its view comes back.
 * @param {HTMLElement} element - The overlay
 * @returns {void}
 */
function releaseOverlay(element) {
  bound.get(element)?.release()
  bound.delete(element)
}

export { giveFocusBack, releaseOverlay, syncOverlay }
