/**
 * @import { ComponentClass } from '@interact/dom/component'
 * @import { Menu } from './menu.js'
 */

import { component } from '@interact/dom'

import { contextMenuView, menuButtonView } from './menu-view.js'

/**
 * The menu button as a custom element class: nothing is registered until the app calls `register`. `create` makes each
 * instance's menu from its element.
 * @template F
 * @param {(host: HTMLElement) => Menu<F>} create - Makes an instance's menu
 * @returns {ComponentClass<Menu<F>>} The class
 */
function menuButtonElement(create) {
  return component(menuButtonView(), create)
}

/**
 * The context menu as a custom element class, opened with `openAt` (see `openOnContextMenu`): nothing is registered
 * until the app calls `register`. `create` makes each instance's menu from its element.
 * @template F
 * @param {(host: HTMLElement) => Menu<F>} create - Makes an instance's menu
 * @returns {ComponentClass<Menu<F>>} The class
 */
function contextMenuElement(create) {
  return component(contextMenuView(), create)
}

/**
 * Opens a menu where the person asks for a context menu over an element, instead of the browser's own.
 * @template F
 * @param {EventTarget} target - Where they ask
 * @param {Menu<F>} menu - The menu
 * @returns {() => void} Stops
 */
function openOnContextMenu(target, menu) {
  /**
   * @param {Event} event - The request
   * @returns {void}
   */
  function opened(event) {
    if (event instanceof MouseEvent) {
      event.preventDefault()
      menu.openAt({ x: event.clientX, y: event.clientY })
    }
  }
  target.addEventListener('contextmenu', opened)
  return () => {
    target.removeEventListener('contextmenu', opened)
  }
}

export { contextMenuElement, menuButtonElement, openOnContextMenu }
