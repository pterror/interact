/**
 * Opening a context menu where the page is right-clicked: on an element named by the menu's `target` attribute, or
 * on its parent.
 */

/** @import { Point } from './menu-place.js' */

/**
 * The element a menu opens over: the one its `target` attribute selects, or its parent
 * @param {HTMLElement} menu - The menu
 * @returns {Element | undefined} The element, if there is one
 */
function triggerOf(menu) {
  const selector = menu.getAttribute('target')
  if (selector === null || selector === '') {
    return menu.parentElement ?? undefined
  }
  return menu.ownerDocument.querySelector(selector) ?? undefined
}

/**
 * Calls back with where an element is right-clicked, in place of the browser's own menu
 * @param {Element} target - The element
 * @param {(point: Point) => void} open - Opens the menu at the point
 * @returns {() => void} A function that stops
 */
function onContextMenu(target, open) {
  /**
   * Opens the menu where the pointer is
   * @param {Event} event - The contextmenu event
   * @returns {void}
   */
  function opened(event) {
    if (event instanceof MouseEvent) {
      event.preventDefault()
      open({ x: event.clientX, y: event.clientY })
    }
  }
  target.addEventListener('contextmenu', opened)
  return () => {
    target.removeEventListener('contextmenu', opened)
  }
}

/** Whether a menu opens where its target is right-clicked, as its `auto-trigger` attribute says */
class MenuTrigger {
  /**
   * @readonly
   * @type {(point: Point) => void}
   */
  #open
  /** @type {(() => void) | undefined} */
  #stop

  /**
   * Opens a menu at a point
   * @param {(point: Point) => void} open - Opens it there
   */
  constructor(open) {
    this.#open = open
  }

  /**
   * Starts or stops opening a menu where its target is right-clicked
   * @param {HTMLElement} menu - The menu
   * @param {boolean} on - Whether it should
   * @returns {void}
   */
  set(menu, on) {
    this.#stop?.()
    const target = on ? triggerOf(menu) : undefined
    this.#stop = target === undefined ? undefined : onContextMenu(target, this.#open)
  }
}

export { MenuTrigger }
