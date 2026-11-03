/**
 * Overlays for the browser tests: a popup (a button that opens a non-modal dialog of two buttons, anchored to the
 * button or to a point) and a modal (a button that opens a modal dialog of two buttons), each a component.
 * @import { LayerOptions } from '@interact/core/layer'
 * @import { Point } from './anchored.js'
 * @import { View } from './component.js'
 * @import { TemplateResult } from './template.js'
 */

import { Controllable, Layer } from '@interact/core'

import { component } from './component.js'
import { css, joinStyles } from './css.js'
import { overlayStyles } from './overlay-styles.js'
import { releaseOverlay, syncOverlay } from './overlay.js'
import { register } from './register.js'
import { html } from './template.js'

/** @type {Point | undefined} */
const NO_POINT = undefined

/** A fixture's state: its layer, and the point it is anchored to instead of its button, if any. */
class Popup {
  /** @readonly */
  layer
  /**
   * @readonly
   * @type {Controllable<Point | undefined>}
   */
  point = new Controllable(NO_POINT, false)

  /**
   * @param {LayerOptions} options - How its layer is made
   */
  constructor(options) {
    this.layer = new Layer(options)
  }

  /**
   * Calls `listener` when it opens or closes, or its point changes.
   * @param {() => void} listener - What to call
   * @returns {() => void} Stops calling it
   */
  subscribe(listener) {
    const stops = [this.layer.open.subscribe(listener), this.point.subscribe(listener)]
    return () => {
      for (const stop of stops) {
        stop()
      }
    }
  }
}

const fixtureStyles = css`
  @layer interact.structure, interact.theme;

  @layer interact.structure {
    :where([part~='overlay']) {
      inline-size: 120px;
      block-size: 60px;
      padding: 0;
      border: 1px solid CanvasText;
      background: Canvas;
      color: CanvasText;
    }
  }
`

/**
 * The parts of a fixture's view.
 * @param {HTMLElement} root - Where its view is
 * @returns {Readonly<{ trigger: HTMLElement, overlay: HTMLElement }>} Its button and its overlay
 */
function partsOf(root) {
  const button = root.querySelector(':scope > [part~="trigger"]')
  const overlay = root.querySelector(':scope > [part~="overlay"]')
  if (!(button instanceof HTMLElement) || !(overlay instanceof HTMLElement)) {
    throw new TypeError('The fixture has no trigger or overlay')
  }
  return { overlay, trigger: button }
}

/**
 * A fixture's button, which opens and closes it.
 * @param {Popup} popup - Its state
 * @returns {TemplateResult} The button
 */
function trigger(popup) {
  return html`<button
    part="trigger"
    aria-haspopup="dialog"
    aria-expanded=${popup.layer.open.get() ? 'true' : 'false'}
    @click=${() => {
      popup.layer.open.request(!popup.layer.open.get())
    }}
    >Open</button
  >`
}

/**
 * Keeps a fixture's overlay in line with its layer, after every render: a popup anchored to its point or its button,
 * a modal where the browser puts a dialog.
 * @param {Popup} popup - Its state
 * @param {HTMLElement} root - Where its view is
 * @returns {void}
 */
function synced(popup, root) {
  const parts = partsOf(root)
  const anchor = popup.layer.modal ? undefined : (popup.point.get() ?? parts.trigger)
  syncOverlay(parts.overlay, popup.layer, anchor === undefined ? {} : { anchor })
}

/**
 * Lets a fixture's overlay go when it leaves the page.
 * @param {Popup} _popup - Its state
 * @param {HTMLElement} root - Where its view was
 * @returns {void}
 */
function released(_popup, root) {
  releaseOverlay(partsOf(root).overlay)
}

/** @type {View<Popup>} */
const popupView = {
  disconnected: released,
  kind: 'popup',
  render: (popup) =>
    html`${trigger(popup)}<div part="overlay" popover="manual" role="dialog" aria-label="Choices"
        ><button part="first">One</button><button part="second">Two</button></div
      >`,
  rendered: synced,
  styles: joinStyles(overlayStyles, fixtureStyles),
}

/** @type {View<Popup>} */
const modalView = {
  disconnected: released,
  kind: 'modal',
  render: (popup) =>
    html`${trigger(popup)}<dialog part="overlay" closedby="none" aria-label="Settings"
        ><button part="first">One</button><button part="second">Two</button></dialog
      >`,
  rendered: synced,
  styles: joinStyles(overlayStyles, fixtureStyles),
}

/**
 * Registers the popup and the modal as `o-popup` and `o-modal`, each instance's layer made with `options`, and noted
 * in `made` by its element.
 * @param {LayerOptions} options - How their layers are made
 * @param {Map<HTMLElement, Popup>} made - Where each instance's state is noted
 * @returns {void}
 */
function registerOverlays(options, made) {
  /**
   * @param {HTMLElement} host - The element
   * @param {boolean} modal - Whether its layer is modal
   * @returns {Popup} Its state
   */
  function create(host, modal) {
    const popup = new Popup({ ...options, modal })
    made.set(host, popup)
    return popup
  }
  const PopupElement = component(popupView, (host) => create(host, false))
  const ModalElement = component(modalView, (host) => create(host, true))
  register([PopupElement, ModalElement], { prefix: 'o' })
}

export { Popup, modalView, partsOf, popupView, registerOverlays }
