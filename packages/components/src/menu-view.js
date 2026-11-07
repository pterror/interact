/**
 * A menu's default web views: a menu button (a button that opens its menu below it) and a context menu (a menu that
 * opens at a point). Each shows the menu's content, with its submenus, in an overlay, and runs the menu's view plugins
 * on its element.
 * @import { Placement } from '@interact/dom/anchored'
 * @import { View } from '@interact/dom/component'
 * @import { Mount } from '@interact/dom/store-view'
 * @import { TemplateResult } from '@interact/dom/template'
 * @import { Menu } from './menu.js'
 */

import { contentOf, html, mountStore, ownElement, releaseOverlay, syncOverlay } from '@interact/dom'

import { menuStyles } from './menu-styles.js'

/**
 * Where a context menu goes: its corner at the point it was asked for.
 * @type {Partial<Placement>}
 */
const AT_POINT = { align: 'start', gap: 0, side: 'block-end' }

/**
 * A menu button's id.
 * @param {Menu} menu - The menu
 * @returns {string} The id
 */
function buttonId(menu) {
  return `${menu.core.id}-button`
}

/**
 * What one of a view's parts is, if it is there: an element directly inside `parent`.
 * @param {HTMLElement} parent - Where to look
 * @param {string} part - The part
 * @returns {HTMLElement | undefined} The part
 */
function partIn(parent, part) {
  const found = parent.querySelector(`:scope > [part~="${part}"]`)
  return found instanceof HTMLElement ? found : undefined
}

/**
 * What a key on a menu button does beyond pressing it, as the APG menu button pattern has it: Down opens the menu with
 * focus on its first item, Up on its last.
 * @param {Menu} menu - The menu
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
 * A menu button: the button, named by the menu's label, and the menu's overlay.
 * @param {Menu} menu - The menu
 * @returns {TemplateResult} The view
 */
function renderButton(menu) {
  return html`<button
      part="button"
      type="button"
      id=${buttonId(menu)}
      aria-haspopup="menu"
      aria-expanded=${menu.layer.open.get() ? 'true' : 'false'}
      aria-controls=${menu.core.listId}
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
      >${menu.core.label}</button
    ><div part="overlay" popover="manual">${contentOf(menu)}</div>`
}

/**
 * A context menu: the menu's overlay, opened at a point (`openAt`).
 * @param {Menu} menu - The menu
 * @returns {TemplateResult} The view
 */
function renderContext(menu) {
  return html`<div part="overlay" popover="manual">${contentOf(menu)}</div>`
}

/**
 * A menu's web view, rendering it with `render`: after each render, its overlay is shown beside its button or at its
 * point, focus taken into its list as it opens and given back as it closes, and its view plugins told.
 * @param {string} kind - The view's kind
 * @param {(menu: Menu) => TemplateResult} render - What it renders
 * @returns {View<Menu>} The view
 */
function menuView(kind, render) {
  /** @type {WeakMap<Menu, Mount>} */
  const mounted = new WeakMap()
  return {
    disconnected: (menu, root) => {
      mounted.get(menu)?.destroy()
      mounted.delete(menu)
      const overlay = partIn(root, 'overlay')
      if (overlay !== undefined) {
        releaseOverlay(overlay)
      }
    },
    kind,
    render,
    rendered: (menu, root) => {
      const overlay = partIn(root, 'overlay')
      if (overlay === undefined) {
        return
      }
      const { point } = menu
      const anchor = point ?? partIn(root, 'button')
      syncOverlay(overlay, menu.layer, {
        ...(anchor === undefined ? {} : { anchor }),
        ...(point === undefined ? {} : { placement: AT_POINT }),
        focus: 'move',
        initialFocus: () => ownElement(overlay, '[data-list]'),
      })
      let mount = mounted.get(menu)
      if (mount === undefined) {
        mount = mountStore(menu, root)
        mounted.set(menu, mount)
      }
      mount.rendered()
    },
    styles: menuStyles,
  }
}

/**
 * The menu button's default web view.
 * @returns {View<Menu>} The view
 */
function menuButtonView() {
  return menuView('menu-button', renderButton)
}

/**
 * The context menu's default web view.
 * @returns {View<Menu>} The view
 */
function contextMenuView() {
  return menuView('context-menu', renderContext)
}

export { contextMenuView, menuButtonView }
