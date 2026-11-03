/**
 * Overlay browser-test scenarios that run whole in the page: showing an overlay outside an open modal, a fixture
 * leaving the page and coming back, and adopting a server-rendered fixture.
 */

import { Layer } from '@interact/core'

import { layersOf } from './document-layers.js'
import { syncOverlay } from './overlay.js'
import { boxOf, fixture, isShowing, popupOf, setUp, settle, showing, viewOf } from './test-overlay-page.js'
import { partsOf } from './test-overlay.js'

const NONE = 0

/**
 * Tries to show a popover outside the page's open modal dialog.
 * @returns {string} Why it couldn't, or "shown"
 */
function openOverModal() {
  const popover = document.createElement('div')
  popover.setAttribute('popover', 'manual')
  document.body.append(popover)
  try {
    syncOverlay(popover, new Layer({ open: true }))
    return 'shown'
  } catch (error) {
    return error instanceof Error ? error.message : 'not an error'
  } finally {
    popover.remove()
  }
}

/**
 * Takes a fixture out of the page and puts it back: how many layers were stacked while it was out, whether its layer
 * stayed open, and whether its overlay showed again once it was back.
 * @param {string} id - The fixture's id
 * @returns {Promise<Readonly<{ stackedWhileOut: number, openWhileOut: boolean, shownBack: boolean }>>} What happened
 */
async function detachAndReattach(id) {
  const element = fixture(id)
  const popup = popupOf(id)
  const parent = element.parentNode
  element.remove()
  const out = { openWhileOut: popup.layer.open.get(), stackedWhileOut: layersOf(document).stack.layers().length }
  parent?.append(element)
  await settle()
  return { ...out, shownBack: showing(id).shown }
}

/**
 * The server-rendered popup in the page, named "server".
 * @returns {HTMLElement} It
 */
function serverPopup() {
  const host = document.querySelector('o-popup')
  if (!(host instanceof HTMLElement)) {
    throw new TypeError('No server-rendered popup')
  }
  host.id = 'server'
  return host
}

/**
 * Adopts the server-rendered popup: notes its nodes and where its button is, registers the fixtures, and reports
 * whether the nodes stayed, the button moved, and the overlay took no room before and stayed hidden after.
 * @returns {Promise<Readonly<{ same: boolean, moved: boolean, hiddenBefore: boolean, hiddenAfter: boolean }>>} What
 *   adopting left
 */
async function adoptServer() {
  const host = serverPopup()
  const before = partsOf(viewOf(host))
  const triggerBefore = JSON.stringify(boxOf(before.trigger))
  const hiddenBefore = boxOf(before.overlay).width === NONE
  setUp()
  await settle()
  const after = partsOf(viewOf(host))
  return {
    hiddenAfter: !isShowing(after.overlay),
    hiddenBefore,
    moved: JSON.stringify(boxOf(after.trigger)) !== triggerBefore,
    same: after.trigger === before.trigger && after.overlay === before.overlay,
  }
}

export { adoptServer, detachAndReattach, openOverModal }
