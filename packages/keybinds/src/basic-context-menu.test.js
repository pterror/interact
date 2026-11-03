/** @import { Command } from './command.js' */

import { afterEach, describe, expect, mock, test } from 'bun:test'

import { BasicContextMenu } from './basic-context-menu.js'
import { createComponent } from './create-component.js'
import { partOf, shadowOf, textsOf } from './test-components.js'
import { kbd } from './test-helpers.js'

const FIRST = 0
const ONCE = 1
const ITEMS = '.context-menu__item'
const AT = 40

/** @type {Element[]} */
const placed = []

afterEach(() => {
  for (const element of placed.splice(FIRST)) {
    element.remove()
  }
})

/**
 * A menu in the page until the test ends, with commands
 * @param {readonly Command[]} commands - Its commands
 * @returns {BasicContextMenu} The menu, not yet open
 */
function menuOf(commands) {
  const menu = createComponent(BasicContextMenu)
  menu.commands = commands
  document.body.append(menu)
  placed.push(menu)
  return menu
}

/**
 * Presses a key in a menu's shadow DOM, where it listens
 * @param {ShadowRoot} shadow - The menu's shadow root
 * @param {string} key - The key
 * @returns {void}
 */
function press(shadow, key) {
  shadow.dispatchEvent(kbd('keydown', { key }))
}

describe('an open basic menu', () => {
  test('shows only the commands tagged with its menu, those that do not apply disabled', () => {
    const menu = menuOf([
      { execute: () => undefined, id: 'cut', label: 'Cut', menu: 'edit' },
      { execute: () => undefined, id: 'paste', label: 'Paste', menu: ['edit', 'other'], when: () => false },
      { execute: () => undefined, id: 'zoom', label: 'Zoom', menu: 'view' },
    ])
    menu.menu = 'edit'
    menu.open = true
    expect(textsOf(menu, ITEMS)).toEqual(['Cut', 'Paste'])
    expect(partOf(menu, '.context-menu__item--disabled', HTMLElement).textContent).toBe('Paste')
  })

  test('runs a clicked command, closes, and says which command ran', () => {
    const execute = mock(() => undefined)
    const menu = menuOf([{ execute, id: 'go', label: 'Go' }])
    /** @type {Event[]} */
    const heard = []
    menu.addEventListener('execute', (event) => {
      heard.push(event)
    })
    menu.open = true
    partOf(menu, ITEMS, HTMLElement).click()
    expect(execute).toHaveBeenCalledTimes(ONCE)
    expect(heard).toHaveLength(ONCE)
    expect(menu.open).toBe(false)
  })

  test('does nothing when a command that does not apply is clicked', () => {
    const execute = mock(() => undefined)
    const menu = menuOf([{ execute, id: 'no', label: 'No', when: () => false }])
    menu.open = true
    partOf(menu, ITEMS, HTMLElement).click()
    expect(execute).not.toHaveBeenCalled()
    expect(menu.open).toBe(true)
  })
})

describe('the keys in an open basic menu', () => {
  test('move through its items with the arrows, and run one with Enter', () => {
    const first = mock(() => undefined)
    const second = mock(() => undefined)
    const menu = menuOf([
      { execute: first, id: 'one', label: 'One' },
      { execute: second, id: 'two', label: 'Two' },
    ])
    menu.open = true
    press(shadowOf(menu), 'ArrowDown')
    press(shadowOf(menu), 'ArrowDown')
    expect(partOf(menu, '.context-menu__item--active', HTMLElement).textContent).toBe('Two')
    press(shadowOf(menu), 'Enter')
    expect(second).toHaveBeenCalledTimes(ONCE)
    expect(first).not.toHaveBeenCalled()
  })

  test('close it with Escape', () => {
    const menu = menuOf([{ execute: () => undefined, id: 'one', label: 'One' }])
    menu.open = true
    press(shadowOf(menu), 'Escape')
    expect(menu.open).toBe(false)
  })
})

describe('a basic menu told to open by itself', () => {
  test('opens where its parent is right-clicked', () => {
    const parent = document.createElement('div')
    document.body.append(parent)
    placed.push(parent)
    const menu = createComponent(BasicContextMenu)
    menu.toggleAttribute('auto-trigger', true)
    parent.append(menu)
    parent.dispatchEvent(new MouseEvent('contextmenu', { cancelable: true, clientX: AT, clientY: AT }))
    expect(menu.open).toBe(true)
    expect(menu.position).toEqual({ x: AT, y: AT })
  })
})
