/**
 * Giving focus back when an overlay hides: to where it came from, if hiding lost it.
 */

import { layersOf } from './document-layers.js'
import { deepActiveElement, flatContains } from './flat-tree.js'

/**
 * Where focus can go back to: the element focus came from, if it can still take it; if it is inside an overlay that
 * closed, where that overlay's focus came from; otherwise nowhere.
 * @param {Element | undefined} target - Where focus came from
 * @param {Document} document - The document
 * @param {(overlay: HTMLElement) => Element | undefined} cameFrom - Where an overlay's focus came from
 * @returns {HTMLElement | undefined} Where it can go back to
 */
function usableReturn(target, document, cameFrom) {
  if (target === undefined || !target.isConnected) {
    return undefined
  }
  if (target instanceof HTMLElement && target.checkVisibility()) {
    return target
  }
  const holder = layersOf(document)
    .allParts()
    .find((parts) => flatContains(parts.element, target))
  return holder === undefined ? undefined : usableReturn(cameFrom(holder.element), document, cameFrom)
}

/**
 * Whether focus was lost when an overlay hid: it is nowhere, on the page itself, or still inside the overlay.
 * @param {HTMLElement} element - The overlay
 * @returns {boolean} Whether it was
 */
function focusLost(element) {
  const active = deepActiveElement(element.ownerDocument)
  return active === undefined || active === element.ownerDocument.body || flatContains(element, active)
}

/**
 * Gives focus back to where it came from once an overlay has hidden, if hiding lost it. Hidden by a press, it waits for
 * the press to end: a press on something that takes focus gives it focus, and only a press on nothing loses it.
 * @param {HTMLElement} element - The overlay, hidden
 * @param {Element} returnTo - Where focus came from when it showed
 * @param {(overlay: HTMLElement) => Element | undefined} cameFrom - Where an overlay's focus came from
 * @returns {Promise<void>} When focus is back, or stays where it is
 */
async function giveFocusBack(element, returnTo, cameFrom) {
  const document = element.ownerDocument
  await layersOf(document).pressEnded()
  if (focusLost(element)) {
    usableReturn(returnTo, document, cameFrom)?.focus({ preventScroll: true })
  }
}

export { giveFocusBack }
