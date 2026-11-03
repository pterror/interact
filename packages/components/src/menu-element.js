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

const NONE = 0

/**
 * Whether a context menu was asked for from the keyboard (the Context Menu key, Shift+F10) rather than the pointer:
 * Chrome says so with button -1; an engine giving no point and no press count is taken as saying the same.
 * @param {MouseEvent} event - The request
 * @returns {boolean} Whether it came from the keyboard
 */
function fromKeyboard(event) {
  return event.button < NONE || (event.detail === NONE && event.clientX === NONE && event.clientY === NONE)
}

/**
 * Where a context menu opens: where the pointer asked for it, or, asked for from the keyboard, at the start of the
 * bottom edge of what has focus, whatever point the engine reports for a key.
 * @param {MouseEvent} event - The request
 * @param {EventTarget} target - Where it was heard
 * @returns {Readonly<{ x: number, y: number }>} The point
 */
function pointFor(event, target) {
  if (!fromKeyboard(event)) {
    return { x: event.clientX, y: event.clientY }
  }
  const [origin] = event.composedPath()
  const element = origin instanceof Element ? origin : target
  if (!(element instanceof Element)) {
    return { x: event.clientX, y: event.clientY }
  }
  const box = element.getBoundingClientRect()
  const rtl = getComputedStyle(element).direction === 'rtl'
  return { x: rtl ? box.right : box.left, y: box.bottom }
}

/**
 * Opens a menu where the person asks for a context menu over an element, instead of the browser's own: at the
 * pointer, or below what has focus when they ask from the keyboard.
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
      menu.openAt(pointFor(event, target))
    }
  }
  target.addEventListener('contextmenu', opened)
  return () => {
    target.removeEventListener('contextmenu', opened)
  }
}

export { contextMenuElement, menuButtonElement, openOnContextMenu }
