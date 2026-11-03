/**
 * The menu in a browser test's page: registering it, putting a menu button or a context menu in the page, and seeing
 * what is open, where focus is, and what was chosen.
 * @import { Span } from '@interact/core/memory-source'
 * @import { DomMode } from '@interact/dom/css'
 * @import { Menu } from './menu.js'
 */

import { deepActiveElement, register } from '@interact/dom'

import { contextMenuElement, menuButtonElement, openOnContextMenu } from './menu-element.js'
import { editMenu } from './test-menus.js'

/**
 * A box on the page.
 * @typedef {Readonly<{ x: number, y: number, width: number, height: number }>} Box
 */

/**
 * What the page's menu shows: whether each overlay (the menu's, then each submenu's) is open, where focus is, the label
 * of the active item where focus is, the button's `aria-expanded`, the overlays' boxes, and what was chosen.
 * @typedef {Readonly<{
 *   open: readonly boolean[],
 *   focus: string,
 *   active: string | undefined,
 *   expanded: string | undefined,
 *   boxes: readonly Box[],
 *   chosen: readonly string[],
 * }>} MenuSeen
 */

/** @type {string[]} */
const chosen = []
/** @type {Map<string, Menu<Span>>} */
const made = new Map()

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
 * Waits for renders, and the frames that place overlays, to pass.
 * @returns {Promise<void>} When they have
 */
async function settle() {
  await frame()
  await frame()
}

/**
 * Makes a menu of one kind, noting what is chosen in it.
 * @param {string} kind - Which kind
 * @returns {Menu<Span>} The menu
 */
function makeMenu(kind) {
  const menu = editMenu()
  menu.onSelect(({ entry }) => {
    chosen.push(entry.id)
  })
  made.set(kind, menu)
  return menu
}

/**
 * Registers the menu button and the context menu as `m-menu-button` and `m-context-menu`.
 * @returns {void}
 */
function registerMenus() {
  register([menuButtonElement(() => makeMenu('button')), contextMenuElement(() => makeMenu('context'))], {
    prefix: 'm',
  })
}

/**
 * The root the page's menu view is in.
 * @returns {HTMLElement | ShadowRoot} The root
 */
function rootOf() {
  const host = document.querySelector('m-menu-button, m-context-menu')
  if (!(host instanceof HTMLElement)) {
    throw new TypeError('There is no menu')
  }
  return host.shadowRoot ?? host
}

/**
 * An element in the menu's view, found by id.
 * @param {string} id - Its id
 * @returns {HTMLElement} It
 */
function byId(id) {
  const found = rootOf().querySelector(`[id="${id}"]`)
  if (!(found instanceof HTMLElement)) {
    throw new TypeError(`There is no #${id}`)
  }
  return found
}

/**
 * A focusable box the context menu opens over, at 300, 200 on the page.
 * @param {Menu<Span>} menu - The context menu
 * @returns {HTMLElement} The box
 */
function contextTarget(menu) {
  const target = document.createElement('div')
  target.id = 'target'
  target.tabIndex = 0
  target.textContent = 'Here'
  target.setAttribute('style', 'position: fixed; left: 300px; top: 200px; width: 200px; height: 100px')
  openOnContextMenu(target, menu)
  return target
}

/**
 * A button to come after the menu in the page, for Tab to move focus to.
 * @returns {HTMLElement} The button
 */
function afterButton() {
  const after = document.createElement('button')
  after.id = 'after'
  after.textContent = 'After'
  return after
}

/**
 * Focuses where a person starts: the menu's button, or the context menu's box.
 * @param {'button' | 'context'} kind - Which menu
 * @returns {void}
 */
function focusStart(kind) {
  const focus = kind === 'button' ? rootOf().querySelector('[part~="button"]') : document.querySelector('#target')
  if (focus instanceof HTMLElement) {
    focus.focus()
  }
}

/**
 * Puts a menu button, or a context menu over a focusable box, in the page, in a DOM mode, with a button after it, and
 * focuses the menu's button or the box.
 * @param {'button' | 'context'} kind - Which
 * @param {DomMode} mode - Where it lives
 * @returns {Promise<void>} When it has rendered
 */
async function putMenu(kind, mode) {
  registerMenus()
  const element = document.createElement(kind === 'button' ? 'm-menu-button' : 'm-context-menu')
  element.setAttribute('dom-mode', mode)
  document.body.append(element, afterButton())
  const menu = made.get(kind)
  if (kind === 'context' && menu !== undefined) {
    document.body.append(contextTarget(menu))
  }
  await settle()
  focusStart(kind)
}

/**
 * Where focus is, by name: the menu's button, a menu's list by its id, the context menu's box, or the page.
 * @returns {string} The name
 */
function focusName() {
  const active = deepActiveElement(document)
  if (active === undefined || active === document.body) {
    return 'page'
  }
  if (active.matches('[part~="button"]')) {
    return 'button'
  }
  return active.id === '' ? active.tagName.toLowerCase() : active.id
}

/**
 * The label of the active item in the list that has focus.
 * @returns {string | undefined} The label
 */
function activeLabel() {
  const id = deepActiveElement(document)?.getAttribute('aria-activedescendant')
  return id === null || id === undefined ? undefined : (byId(id).querySelector('[part~="label"]')?.textContent ?? '')
}

/**
 * A box, as plain numbers.
 * @param {Element} element - What it is the box of
 * @returns {Box} The box
 */
function boxOf(element) {
  const { height, width, x, y } = element.getBoundingClientRect()
  return { height, width, x, y }
}

/**
 * What the page's menu shows now, once renders have passed.
 * @returns {Promise<MenuSeen>} What showed
 */
async function seen() {
  await settle()
  const root = rootOf()
  const overlays = [...root.querySelectorAll('[part~="overlay"]')]
  return {
    active: activeLabel(),
    boxes: overlays.map((overlay) => boxOf(overlay)),
    chosen: [...chosen],
    expanded: root.querySelector('[part~="button"]')?.getAttribute('aria-expanded') ?? undefined,
    focus: focusName(),
    open: overlays.map((overlay) => overlay.matches(':popover-open')),
  }
}

/**
 * The box of a row, by its id.
 * @param {string} id - The row's id
 * @returns {Box} Its box
 */
function rowBox(id) {
  return boxOf(byId(id))
}

/**
 * Adopts the server's menu button: notes its button, registers the element, and reports whether the same button
 * stayed, and what shows.
 * @returns {Promise<MenuSeen & Readonly<{ same: boolean }>>} What adopting left
 */
async function adoptMenu() {
  const before = rootOf().querySelector('[part~="button"]')
  registerMenus()
  await settle()
  const after = rootOf().querySelector('[part~="button"]')
  return { ...(await seen()), same: before !== null && before === after }
}

/**
 * The box of the menu's button.
 * @returns {Box} Its box
 */
function buttonBox() {
  const button = rootOf().querySelector('[part~="button"]')
  if (button === null) {
    throw new TypeError('The menu has no button')
  }
  return boxOf(button)
}

/**
 * Focuses the menu's button.
 * @returns {void}
 */
function focusButton() {
  const button = rootOf().querySelector('[part~="button"]')
  if (button instanceof HTMLElement) {
    button.focus()
  }
}

/**
 * Asks for the context menu from the keyboard as an engine with no point for it would: focus on the box, and a
 * contextmenu with no point and no press count.
 * @returns {void}
 */
function askFromKeyboard() {
  const target = document.querySelector('#target')
  if (!(target instanceof HTMLElement)) {
    throw new TypeError('There is no box to ask over')
  }
  target.focus()
  target.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, composed: true }))
}

export { adoptMenu, askFromKeyboard, buttonBox, focusButton, putMenu, rowBox, seen, settle }
