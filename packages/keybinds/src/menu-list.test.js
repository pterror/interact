/** @import { ActiveCommand } from './search.js' */

import { describe, expect, test } from 'bun:test'

import { keysUI } from './keys-ui.js'
import { MenuList } from './menu-list.js'

const NONE = -1
const SECOND = 1
const INPUTS = [keysUI()]

/**
 * A command that applies, and does nothing
 * @param {string} id - Its id
 * @param {string} [category] - Its category
 * @returns {ActiveCommand} The command, applying
 */
function row(id, category) {
  return { active: true, command: { category, execute: () => undefined, id, label: id } }
}

/**
 * A list showing commands, noting which are chosen
 * @param {readonly ActiveCommand[]} rows - The commands
 * @returns {Readonly<{ chosen: readonly number[], element: HTMLUListElement, list: MenuList }>} The list, its element,
 *   and the indexes chosen
 */
function listOf(rows) {
  const element = document.createElement('ul')
  /** @type {number[]} */
  const chosen = []
  const list = new MenuList(element, (index) => {
    chosen.push(index)
  })
  list.show(rows, INPUTS)
  return { chosen, element, list }
}

/**
 * The items in a list element
 * @param {HTMLUListElement} element - The list
 * @returns {HTMLLIElement[]} Its command items
 */
function itemsOf(element) {
  return [...element.querySelectorAll('li')].filter((item) => item.className.startsWith('context-menu__item'))
}

describe('a menu list', () => {
  test('separates categories that change from one that was set', () => {
    const { element } = listOf([row('a', 'One'), row('b', 'Two'), row('c'), row('d', 'Two')])
    const kinds = Array.from(element.children, (child) => child.className)
    expect(kinds).toEqual([
      'context-menu__item',
      'context-menu__separator',
      'context-menu__item',
      'context-menu__separator',
      'context-menu__item',
      'context-menu__item',
    ])
  })

  test('marks the item pointed at active on the item that is there, which a click then runs', () => {
    const { chosen, element, list } = listOf([row('one'), row('two')])
    const before = itemsOf(element)[SECOND]
    element.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }))
    before?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    expect(itemsOf(element)[SECOND]).toBe(before)
    expect(list.active).toBe(SECOND)
    before?.click()
    expect(chosen).toEqual([SECOND])
  })

  test('starts with nothing active, and wraps as the keys move', () => {
    const { list } = listOf([row('one'), row('two')])
    expect(list.active).toBe(NONE)
    list.move('up')
    expect(list.active).toBe(SECOND)
    list.move('down')
    list.move('end')
    list.move('home')
    list.move('up')
    expect(list.active).toBe(SECOND)
  })
})
