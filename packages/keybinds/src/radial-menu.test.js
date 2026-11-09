import { afterEach, describe, expect, test } from 'bun:test'

import { RadialMenu, slotForKey } from './radial-menu.js'
import { elementOf, shadowOf, textsOf } from './test-components.js'
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
 * A listener that keeps the detail of each event it hears, as a CustomEvent carries it
 * @returns {Readonly<{ details: readonly unknown[], listener: (event: Event) => void }>} The listener, and the details
 *   as they're heard
 */
function heardEvents() {
  /** @type {unknown[]} */
  const details = []
  return {
    details,
    listener: (event) => {
      details.push(event instanceof CustomEvent ? event.detail : undefined)
    },
  }
}

/**
 * An open radial menu in the page, with commands that note when they run
 * @param {readonly Readonly<{ id: string, when?: () => boolean }>[]} specs - The commands' ids, and when they apply
 * @returns {Readonly<{ heard: Readonly<{ close: readonly unknown[], command: readonly unknown[] }>, menu: RadialMenu,
 *   ran: readonly string[] }>} The menu, what ran, and the detail of each 'command' and 'close' it dispatched
 */
function opened(specs) {
  /** @type {string[]} */
  const ran = []
  const menu = elementOf('keybinds-radial-menu', RadialMenu)
  const heard = { close: heardEvents(), command: heardEvents() }
  menu.addEventListener('close', heard.close.listener)
  menu.addEventListener('command', heard.command.listener)
  document.body.append(menu)
  placed.push(menu)
  menu.commands = specs.map(({ id, when }) => ({
    execute: () => ran.push(id),
    id,
    label: id.toUpperCase(),
    ...(when === undefined ? {} : { when }),
  }))
  menu.openAt({ x: 100, y: 100 })
  return { heard: { close: heard.close.details, command: heard.command.details }, menu, ran }
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
    const { heard, menu, ran } = opened([{ id: 'up' }, { id: 'next' }, { id: 'right' }])
    press('ArrowRight')
    press('Enter')
    expect([ran, menu.open]).toEqual([['right'], false])
    expect(heard.command).toEqual([{ command: menu.commands[RIGHT] }])
  })

  test('runs a slot clicked, but not one whose command does not apply', () => {
    const { menu, ran } = opened([{ id: 'yes' }, { id: 'no', when: () => false }])
    for (const slot of shadowOf(menu).querySelectorAll('[data-slot]')) {
      slot.dispatchEvent(new MouseEvent('click'))
    }
    expect(ran).toEqual(['yes'])
  })

  test('closes on Escape, saying so', () => {
    const { heard, menu } = opened([{ id: 'one' }])
    press('Escape')
    expect([menu.open, heard.close.length]).toEqual([false, ONCE])
  })
})

const NONE = -1
const FULL = 8
const EMPTY = 0
const THREE = 3
const TOP = 0
const BOTTOM = 4
const LEFT = 6

/**
 * A key going down
 * @param {string} key - The key
 * @param {boolean} [shiftKey] - Whether Shift is held (default false)
 * @returns {Readonly<{ key: string, shiftKey: boolean }>} The key
 */
function pressed(key, shiftKey = false) {
  return { key, shiftKey }
}

describe('the slot a key makes active', () => {
  test.each([
    ['ArrowUp', TOP],
    ['ArrowRight', RIGHT],
    ['ArrowDown', BOTTOM],
    ['ArrowLeft', LEFT],
  ])('is the one %s points at, when every slot is filled', (key, slot) => {
    expect(slotForKey(pressed(key), { active: NONE, filled: FULL })).toBe(slot)
  })

  test('is the nearest filled one, clockwise first, when the one pointed at is empty', () => {
    expect(slotForKey(pressed('ArrowDown'), { active: NONE, filled: THREE })).toBe(RIGHT)
    expect(slotForKey(pressed('ArrowLeft'), { active: NONE, filled: THREE })).toBe(TOP)
  })

  test('goes round the filled slots with Tab, and back with Shift+Tab', () => {
    expect(slotForKey(pressed('Tab'), { active: NONE, filled: THREE })).toBe(TOP)
    expect(slotForKey(pressed('Tab'), { active: RIGHT, filled: THREE })).toBe(TOP)
    expect(slotForKey(pressed('Tab', true), { active: TOP, filled: THREE })).toBe(RIGHT)
    expect(slotForKey(pressed('Tab', true), { active: NONE, filled: THREE })).toBe(RIGHT)
  })

  test('is -1 for a key that moves when nothing is filled, and undefined for a key that does not move', () => {
    expect([
      slotForKey(pressed('ArrowUp'), { active: NONE, filled: EMPTY }),
      slotForKey(pressed('Tab'), { active: NONE, filled: EMPTY }),
    ]).toEqual([NONE, NONE])
    expect(slotForKey(pressed('Enter'), { active: TOP, filled: FULL })).toBeUndefined()
  })
})
