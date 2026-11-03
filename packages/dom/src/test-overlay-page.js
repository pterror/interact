/**
 * What the overlay browser tests run in their pages: putting fixtures in the page and reading back what shows, as plain
 * values. Presses and keys come from the test, as real input.
 * @import { LayerOptions } from '@interact/core/layer'
 * @import { Point } from './anchored.js'
 * @import { DomMode } from './css.js'
 * @import { Popup } from './test-overlay.js'
 */

import { deepActiveElement } from './flat-tree.js'
import { partsOf, registerOverlays } from './test-overlay.js'

/**
 * A rectangle on the screen, rounded to the pixel.
 * @typedef {Readonly<{ x: number, y: number, width: number, height: number }>} Box
 */

/**
 * What a fixture shows: whether its layer is open and its overlay showing, where its button, overlay and the overlay's
 * first button are, the side its overlay was placed on, and whether the overlay is what a press at its middle reaches.
 * @typedef {Readonly<{
 *   open: boolean,
 *   shown: boolean,
 *   trigger: Box,
 *   overlay: Box,
 *   first: Box,
 *   side: string | undefined,
 *   onTop: boolean,
 * }>} Showing
 */

const HALF = 2

/** @type {Map<HTMLElement, Popup>} */
const made = new Map()
/** @type {string[]} */
const heard = []

/**
 * Registers the fixtures, their layers made with `options`.
 * @param {LayerOptions} [options] - How their layers are made
 * @returns {void}
 */
function setUp(options = {}) {
  registerOverlays(options, made)
}

/**
 * An element by id in a root, or in the shadow roots of the components in it, however deep.
 * @param {Document | ShadowRoot} root - Where to look
 * @param {string} id - Its id
 * @returns {HTMLElement | undefined} The element, if it is there
 */
function findIn(root, id) {
  const direct = root.querySelector(`#${CSS.escape(id)}`)
  if (direct instanceof HTMLElement) {
    return direct
  }
  for (const host of root.querySelectorAll('[data-interact]')) {
    const inner = host.shadowRoot === null ? undefined : findIn(host.shadowRoot, id)
    if (inner !== undefined) {
      return inner
    }
  }
  return undefined
}

/**
 * A fixture in the page, by id.
 * @param {string} id - Its id
 * @returns {HTMLElement} It
 */
function fixture(id) {
  const found = findIn(document, id)
  if (found === undefined) {
    throw new TypeError(`No fixture #${id}`)
  }
  return found
}

/**
 * Where a fixture's view is: its shadow root's view element, or itself.
 * @param {HTMLElement} host - The fixture
 * @returns {HTMLElement} Where its view is
 */
function viewOf(host) {
  const inner = host.shadowRoot?.querySelector('[data-interact-view]')
  return inner instanceof HTMLElement ? inner : host
}

/**
 * A fixture's state.
 * @param {string} id - Its id
 * @returns {Popup} Its state
 */
function popupOf(id) {
  const popup = made.get(fixture(id))
  if (popup === undefined) {
    throw new TypeError(`#${id} has no state`)
  }
  return popup
}

/**
 * Puts a fixture in the page, before everything else in it or inside another's overlay, and positioned if asked.
 * @param {Readonly<{ kind: 'popup' | 'modal', id: string, mode: DomMode, at?: Point, inside?: string }>} where - What
 *   and where
 * @returns {void}
 */
function put(where) {
  const element = document.createElement(`o-${where.kind}`)
  element.id = where.id
  element.setAttribute('dom-mode', where.mode)
  if (where.at !== undefined) {
    element.style.cssText = `position: absolute; left: ${String(where.at.x)}px; top: ${String(where.at.y)}px`
  }
  if (where.inside === undefined) {
    document.body.prepend(element)
  } else {
    partsOf(viewOf(fixture(where.inside))).overlay.append(element)
  }
}

/**
 * A box, rounded to the pixel.
 * @param {Element} element - What to measure
 * @returns {Box} Where it is
 */
function boxOf(element) {
  const box = element.getBoundingClientRect()
  return { height: Math.round(box.height), width: Math.round(box.width), x: Math.round(box.x), y: Math.round(box.y) }
}

/**
 * Whether a press at an element's middle reaches it, or something inside it.
 * @param {HTMLElement} element - The element
 * @returns {boolean} Whether it does
 */
function onTop(element) {
  const box = element.getBoundingClientRect()
  const root = element.getRootNode()
  const at = root instanceof ShadowRoot ? root : document
  const hit = at.elementFromPoint(box.x + box.width / HALF, box.y + box.height / HALF)
  return hit !== null && element.contains(hit)
}

/**
 * Whether an overlay is showing.
 * @param {HTMLElement} overlay - The overlay
 * @returns {boolean} Whether it is
 */
function isShowing(overlay) {
  return overlay instanceof HTMLDialogElement ? overlay.open : overlay.matches(':popover-open')
}

/**
 * What a fixture shows now.
 * @param {string} id - Its id
 * @returns {Showing} What it shows
 */
function showing(id) {
  const { overlay, trigger } = partsOf(viewOf(fixture(id)))
  const first = overlay.querySelector(':scope > [part~="first"]') ?? overlay
  const shown = isShowing(overlay)
  return {
    first: boxOf(first),
    onTop: shown && onTop(overlay),
    open: popupOf(id).layer.open.get(),
    overlay: boxOf(overlay),
    shown,
    side: overlay.dataset['side'],
    trigger: boxOf(trigger),
  }
}

/**
 * Notes every dismissal of a fixture's layer, by reason.
 * @param {string} id - The fixture's id
 * @returns {void}
 */
function hearDismissals(id) {
  popupOf(id).layer.onDismiss((reason) => {
    heard.push(reason)
  })
}

/**
 * The dismissals heard so far.
 * @returns {readonly string[]} Their reasons, in order
 */
function dismissals() {
  return [...heard]
}

/**
 * Tries to focus the button after the fixtures.
 * @returns {boolean} Whether it took focus
 */
function tryFocusingOutside() {
  const after = document.querySelector('#after')
  if (after instanceof HTMLElement) {
    after.focus()
  }
  return document.activeElement === after
}

/**
 * Waits for the next frame to be drawn.
 * @returns {Promise<void>} When it has been
 */
async function frame() {
  /** @type {PromiseWithResolvers<void>} */
  const drawn = Promise.withResolvers()
  requestAnimationFrame(() => {
    drawn.resolve()
  })
  await drawn.promise
}

/**
 * Waits for renders to happen and two frames to pass, so what was asked for has been drawn.
 * @returns {Promise<void>} When it has
 */
async function settle() {
  await frame()
  await frame()
}

/**
 * Names where focus is: the fixture it is in and its part, or the element's tag outside any fixture.
 * @returns {string} The name
 */
function focusName() {
  const active = deepActiveElement(document)
  if (active === undefined) {
    return 'nowhere'
  }
  const root = active.getRootNode()
  const host = root instanceof ShadowRoot ? root.host : active.parentElement?.closest('[data-interact]')
  const part = active.getAttribute('part')
  return host === null || host === undefined || part === null ? active.tagName.toLowerCase() : `${host.id} ${part}`
}

export {
  boxOf,
  dismissals,
  fixture,
  focusName,
  hearDismissals,
  isShowing,
  popupOf,
  put,
  setUp,
  settle,
  showing,
  tryFocusingOutside,
  viewOf,
}
