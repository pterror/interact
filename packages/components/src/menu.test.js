/** @import { Menu } from './menu.js' */

import { describe, expect, test } from 'bun:test'

import { keyInput } from '@interact/core'
import { contentOf, renderToString } from '@interact/dom'

import { editMenu, manualWait } from './test-menus.js'

const CUT = 0
const PASTE = 2
const WRAP = 4
const SMALL = 7
const LARGE = 8

/**
 * Presses keys in a menu in turn.
 * @param {Menu} menu - The menu
 * @param {readonly string[]} keys - The keys
 * @returns {boolean[]} Whether each meant something
 */
function press(menu, keys) {
  return keys.map((key) => menu.handle(keyInput.of({ alt: false, key, shift: false, toggle: false })))
}

/**
 * Makes an entry active, as the keys would.
 * @param {Menu} menu - The menu
 * @param {number} position - The entry's position
 * @returns {void}
 */
function goTo(menu, position) {
  menu.dispatch({ effects: menu.core.current.go(position) })
}

/**
 * The edit menu, open, with what was chosen in it.
 * @returns {Readonly<{ menu: Menu, chosen: string[] }>} The menu and the ids chosen
 */
function opened() {
  const menu = editMenu(manualWait().wait)
  /** @type {string[]} */
  const chosen = []
  menu.onSelect(({ entry }) => {
    chosen.push(entry.id)
  })
  menu.open()
  return { chosen, menu }
}

describe('a menu', () => {
  test('opens with focus on its first item or its last, showing as many rows as it has entries', () => {
    const { menu } = opened()
    const first = menu.active
    menu.close()
    menu.open('last')
    expect([first, menu.active, menu.layer.open.get()]).toEqual([CUT, LARGE, true])
    expect(renderToString(contentOf(menu))).toContain('--interact-visible-rows: 9')
  })

  test('moves past separators with the arrows, and wraps nowhere', () => {
    const { menu } = opened()
    press(menu, ['ArrowDown', 'ArrowDown', 'ArrowDown'])
    const pastLine = menu.active
    press(menu, ['ArrowUp', 'Home', 'ArrowUp'])
    expect([pastLine, menu.active]).toEqual([WRAP, CUT])
  })

  test('runs a command with Enter, reporting it and closing', () => {
    const { chosen, menu } = opened()
    press(menu, ['ArrowDown', 'Enter'])
    expect([chosen, menu.layer.open.get(), menu.active]).toEqual([['copy'], false, undefined])
  })

  test('leaves a disabled item focusable and does nothing with it', () => {
    const { chosen, menu } = opened()
    press(menu, ['ArrowDown', 'ArrowDown', 'Enter'])
    expect([menu.active, chosen, menu.layer.open.get()]).toEqual([PASTE, [], true])
  })
})

describe('a menu item', () => {
  test('reports a checkbox or radio item with Space and stays open; Enter closes it', () => {
    const { chosen, menu } = opened()
    goTo(menu, WRAP)
    press(menu, [' '])
    goTo(menu, LARGE)
    press(menu, [' '])
    const open = menu.layer.open.get()
    press(menu, ['Enter'])
    expect([chosen, open, menu.layer.open.get()]).toEqual([['wrap', 'large', 'large'], true, false])
  })

  test('takes a space as part of what is typed while typing goes on', () => {
    const { chosen, menu } = opened()
    goTo(menu, SMALL)
    press(menu, ['c', ' '])
    expect(chosen).toEqual([])
  })
})
