/** @import { Command } from './command.js' */

import { afterEach, describe, expect, test } from 'bun:test'

import { createComponent } from './create-component.js'
import { RadialMenu } from './radial-menu.js'
import { shadowOf, textsOf } from './test-components.js'
import { kbd } from './test-helpers.js'

const FIRST = 0
const SLOTS = 8
const RIGHT = 2
const ONCE = 1

/** @type {Element[]} */
const placed = []

afterEach(() => {
  for (const element of placed.splice(FIRST)) {
    element.remove()
  }
})

/**
 * An open radial menu in the page, with commands that note when they run
 * @param {readonly Readonly<{ id: string, when?: () => boolean }>[]} specs - The commands' ids, and when they apply
 * @returns {Readonly<{ menu: RadialMenu, ran: readonly string[] }>} The menu, and what ran
 */
function opened(specs) {
  /** @type {string[]} */
  const ran = []
  const menu = createComponent(RadialMenu)
  document.body.append(menu)
  placed.push(menu)
  /** @type {Command[]} */
  const commands = specs.map(({ id, when }) => ({
    execute: () => ran.push(id),
    id,
    label: id.toUpperCase(),
    ...(when === undefined ? {} : { when }),
  }))
  menu.commands = commands
  menu.openAt({ x: 100, y: 100 })
  return { menu, ran }
}

/**
 * What a menu's events of one type carry, as they're heard
 * @param {EventTarget} menu - The menu
 * @param {string} type - The event's type
 * @returns {readonly unknown[]} Each event's detail
 */
function heardOn(menu, type) {
  /** @type {unknown[]} */
  const heard = []
  menu.addEventListener(type, (event) => {
    heard.push(event instanceof CustomEvent ? event.detail : undefined)
  })
  return heard
}

/**
 * A key going down on the page
 * @param {string} key - The key
 * @returns {void}
 */
function press(key) {
  document.dispatchEvent(kbd('keydown', { key }))
}

describe('a radial menu', () => {
  test('shows its first eight commands in slots, with eight spokes', () => {
    const { menu } = opened(Array.from({ length: 10 }, (_unused, index) => ({ id: `c${index}` })))
    expect(textsOf(menu, '.radial-menu__label')).toEqual(['C0', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7'])
    expect(shadowOf(menu).querySelectorAll('.radial-menu__spoke')).toHaveLength(SLOTS)
  })

  test('runs the slot an arrow chose on Enter, closing first, and says which', () => {
    const { menu, ran } = opened([{ id: 'up' }, { id: 'next' }, { id: 'right' }])
    const heard = heardOn(menu, 'command')
    press('ArrowRight')
    press('Enter')
    expect([ran, menu.open]).toEqual([['right'], false])
    expect(heard).toEqual([{ command: menu.commands[RIGHT] }])
  })

  test('runs a slot clicked, but not one whose command does not apply', () => {
    const { menu, ran } = opened([{ id: 'yes' }, { id: 'no', when: () => false }])
    for (const slot of shadowOf(menu).querySelectorAll('[data-slot]')) {
      slot.dispatchEvent(new MouseEvent('click'))
    }
    expect(ran).toEqual(['yes'])
  })

  test('closes on Escape, saying so', () => {
    const { menu } = opened([{ id: 'one' }])
    const heard = heardOn(menu, 'close')
    press('Escape')
    expect([menu.open, heard.length]).toEqual([false, ONCE])
  })
})
