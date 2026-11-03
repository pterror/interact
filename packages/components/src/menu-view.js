/**
 * A menu's default web views: a menu button (a button that opens its menu below it) and a context menu (a menu that
 * opens at a point), each with its submenus in overlays inside its own.
 * @import { Placement } from '@interact/dom/anchored'
 * @import { View } from '@interact/dom/component'
 * @import { TemplateResult } from '@interact/dom/template'
 * @import { Menu } from './menu.js'
 */

import { html, releaseOverlay, syncOverlay } from '@interact/dom'

import { menuBody } from './menu-rows.js'
import { menuStyles } from './menu-styles.js'
import { syncRows } from './rows-place.js'
import { rowId } from './rows-view.js'

/**
 * The overlay each menu's submenu is shown in, and which submenu, so it is let go when that submenu closes.
 * @type {WeakMap<object, Readonly<{ element: HTMLElement, submenu: object }>>}
 */
const shown = new WeakMap()

/**
 * Where a submenu goes: beside its entry toward the inline end, lined up with it.
 * @type {Partial<Placement>}
 */
const SUBMENU_PLACEMENT = { align: 'start', gap: 0, side: 'inline-end' }

/**
 * Where a context menu goes: its corner at the point it was asked for.
 * @type {Partial<Placement>}
 */
const AT_POINT = { align: 'start', gap: 0, side: 'block-end' }

/**
 * A menu button's id.
 * @template F
 * @param {Menu<F>} menu - The menu
 * @returns {string} The id
 */
function buttonId(menu) {
  return `${menu.id}-button`
}

/**
 * What one of a menu's parts is, if it is there: an element directly inside `parent`.
 * @param {HTMLElement} parent - Where to look
 * @param {string} part - The part
 * @returns {HTMLElement | undefined} The part
 */
function partIn(parent, part) {
  const found = parent.querySelector(`:scope > [part~="${part}"]`)
  return found instanceof HTMLElement ? found : undefined
}

/**
 * Lets go of the overlays of a menu's submenu and of every submenu open from it in turn.
 * @param {object} menu - The menu
 * @returns {void}
 */
function releaseFrom(menu) {
  const known = shown.get(menu)
  if (known !== undefined) {
    releaseFrom(known.submenu)
    releaseOverlay(known.element)
    shown.delete(menu)
  }
}

/**
 * Shows a menu's open submenu in its overlay beside the entry it opened from, letting go of whichever was shown before
 * if it was another, and keeps that submenu in line in turn.
 * @template F
 * @param {Menu<F>} menu - The menu
 * @param {Readonly<{ viewport: HTMLElement, overlay: HTMLElement }>} where - The menu's list, and the overlay it is in
 * @param {() => void} again - Asks for another render
 * @returns {void}
 */
function syncSubmenu(menu, { overlay, viewport }, again) {
  const open = menu.submenu
  const element = open === undefined ? undefined : partIn(overlay, 'submenu')
  const known = shown.get(menu)
  if (known !== undefined && (known.element !== element || known.submenu !== open?.menu)) {
    releaseFrom(menu)
  }
  if (open !== undefined && element !== undefined) {
    const row = viewport.querySelector(`[id="${rowId(menu.list, open.position)}"]`) ?? viewport
    syncOverlay(element, open.menu.layer, { anchor: row, focus: 'stay', placement: SUBMENU_PLACEMENT })
    shown.set(menu, { element, submenu: open.menu })
    syncMenu(open.menu, element, again)
  }
}

/**
 * Keeps a menu's list, and its submenu's overlay and so on down, in line with the menu: the list's scroll position,
 * focus if the menu asks for it, and the open submenu shown beside its entry.
 * @template F
 * @param {Menu<F>} menu - The menu
 * @param {HTMLElement} overlay - The overlay its list is in
 * @param {() => void} again - Asks for another render
 * @returns {void}
 */
function syncMenu(menu, overlay, again) {
  const viewport = partIn(overlay, 'viewport')
  if (viewport === undefined) {
    return
  }
  syncRows(menu.list, viewport, again)
  if (menu.takeFocus()) {
    viewport.focus({ preventScroll: true })
  }
  syncSubmenu(menu, { overlay, viewport }, again)
}

/**
 * After a render: the menu's overlay shown beside its button or at its point, focus taken into its list as it opens and
 * given back as it closes, and its submenus kept in line.
 * @template F
 * @param {Menu<F>} menu - The menu
 * @param {HTMLElement} root - Where its view is
 * @param {() => void} again - Asks for another render
 * @returns {void}
 */
function synced(menu, root, again) {
  const overlay = partIn(root, 'overlay')
  if (overlay === undefined) {
    return
  }
  const point = menu.point.get()
  const anchor = point ?? partIn(root, 'button')
  const viewport = partIn(overlay, 'viewport')
  syncOverlay(overlay, menu.layer, {
    ...(anchor === undefined ? {} : { anchor }),
    ...(point === undefined ? {} : { placement: AT_POINT }),
    focus: 'move',
    initialFocus: () => viewport,
  })
  syncMenu(menu, overlay, again)
}

/**
 * Lets go of a menu's overlays when its view leaves the page.
 * @template F
 * @param {Menu<F>} menu - The menu
 * @param {HTMLElement} root - Where its view was
 * @returns {void}
 */
function released(menu, root) {
  releaseFrom(menu)
  const overlay = partIn(root, 'overlay')
  if (overlay !== undefined) {
    releaseOverlay(overlay)
  }
}

/**
 * What a key on a menu button does beyond pressing it, as the APG menu button pattern has it: Down opens the menu with
 * focus on its first item, Up on its last.
 * @template F
 * @param {Menu<F>} menu - The menu
 * @param {Event} event - The key
 * @returns {void}
 */
function buttonKey(menu, event) {
  if (!(event instanceof KeyboardEvent) || (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')) {
    return
  }
  event.preventDefault()
  menu.open(event.key === 'ArrowUp' ? 'last' : 'first')
}

/**
 * A menu button: the button, named by the menu's label, and the menu's overlay, named by the button.
 * @template F
 * @param {Menu<F>} menu - The menu
 * @returns {TemplateResult} The view
 */
function renderButton(menu) {
  const open = menu.layer.open.get()
  return html`<button
      part="button"
      type="button"
      id=${buttonId(menu)}
      aria-haspopup="menu"
      aria-expanded=${open ? 'true' : 'false'}
      aria-controls=${`${menu.id}-menu`}
      @click=${() => {
        if (menu.layer.open.get()) {
          menu.close()
        } else {
          menu.open('first')
        }
      }}
      @keydown=${(event) => {
        buttonKey(menu, event)
      }}
      >${menu.list.label}</button
    ><div part="overlay" popover="manual">${menuBody(menu, buttonId(menu))}</div>`
}

/**
 * A context menu: the menu's overlay, named by its label, opened at a point (`openAt`).
 * @template F
 * @param {Menu<F>} menu - The menu
 * @returns {TemplateResult} The view
 */
function renderContext(menu) {
  return html`<div part="overlay" popover="manual">${menuBody(menu, undefined)}</div>`
}

/**
 * The menu button's default web view.
 * @template F
 * @returns {View<Menu<F>>} The view
 */
function menuButtonView() {
  return { disconnected: released, kind: 'menu-button', render: renderButton, rendered: synced, styles: menuStyles }
}

/**
 * The context menu's default web view.
 * @template F
 * @returns {View<Menu<F>>} The view
 */
function contextMenuView() {
  return { disconnected: released, kind: 'context-menu', render: renderContext, rendered: synced, styles: menuStyles }
}

export { contextMenuView, menuButtonView }
