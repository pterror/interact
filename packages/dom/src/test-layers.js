/**
 * Pages for the document-layers browser tests: one layer in a document's stack, and events dispatched at the page as
 * the person's would arrive.
 */

import { Layer } from '@interact/core'

import { layersOf } from './document-layers.js'

/**
 * An open layer whose element is a box in the page, followed by the document's layers.
 * @returns {Readonly<{ element: HTMLElement, layer: Layer, stop: () => void }>} The layer, its element, and how to stop
 *   following it
 */
function openLayer() {
  const element = document.createElement('div')
  document.body.append(element)
  const layer = new Layer({ open: true })
  const stop = layersOf(document).add(layer, { anchor: () => undefined, element })
  return { element, layer, stop }
}

/**
 * A touch on the page outside the layer, then the click it turns into.
 * @returns {Readonly<{ afterTouch: boolean, afterClick: boolean }>} Whether the layer was open after each
 */
function touchThenClick() {
  const { layer, stop } = openLayer()
  document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' }))
  const afterTouch = layer.open.get()
  document.body.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch' }))
  document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  const afterClick = layer.open.get()
  stop()
  return { afterClick, afterTouch }
}

/**
 * Escape while an input method composes text, then Escape again.
 * @returns {Readonly<{ composing: boolean, after: boolean, prevented: boolean }>} Whether the layer was open after
 *   each, and whether the second Escape was taken from the page
 */
function escapeWhileComposing() {
  const { layer, stop } = openLayer()
  document.body.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, isComposing: true, key: 'Escape' }))
  const composing = layer.open.get()
  const escape = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape' })
  document.body.dispatchEvent(escape)
  stop()
  return { after: layer.open.get(), composing, prevented: escape.defaultPrevented }
}

/** Notes when the press going on now ends. */
class PressWatch {
  ended = false

  /**
   * Waits for the press to end, and notes it.
   * @returns {Promise<void>} When the press has ended
   */
  async watch() {
    await layersOf(document).pressEnded()
    this.ended = true
  }
}

/**
 * A press outside the layer: whether the press is still going on until the pointer comes up.
 * @returns {Promise<Readonly<{ dismissed: boolean, endedBeforeUp: boolean, endedAfterUp: boolean }>>} What happened
 */
async function pressThenUp() {
  const { layer, stop } = openLayer()
  document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }))
  const press = new PressWatch()
  const ending = press.watch()
  await Promise.resolve()
  const endedBeforeUp = press.ended
  document.body.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'mouse' }))
  await ending
  stop()
  return { dismissed: !layer.open.get(), endedAfterUp: press.ended, endedBeforeUp }
}

/**
 * Focus leaving the page from inside the layer: first as the window losing focus does it, then as a Tab past the
 * page's last element does it, each a focusout going nowhere.
 * @returns {Readonly<{ windowLeft: boolean, tabbedOut: boolean }>} Whether the layer was open after each
 */
function focusLeavesPage() {
  const { element, layer, stop } = openLayer()
  element.dispatchEvent(new FocusEvent('focusout', { bubbles: true, composed: true }))
  const windowLeft = layer.open.get()
  element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Tab' }))
  element.dispatchEvent(new FocusEvent('focusout', { bubbles: true, composed: true }))
  const tabbedOut = layer.open.get()
  stop()
  return { tabbedOut, windowLeft }
}

export { escapeWhileComposing, focusLeavesPage, pressThenUp, touchThenClick }
