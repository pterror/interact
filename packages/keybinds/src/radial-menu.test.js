import { afterAll, afterEach, beforeAll, describe, expect, mock, test } from 'bun:test'

import { keybinds } from './keybinds.js'
import { radialMenu } from './radial-menu.js'
import { kbd } from './test-keys.js'
import { fakePopovers } from './test-popover.js'

/** @type {(() => void)[]} */
const cleanups = []

/** @type {() => void} */
let unfake = () => undefined

beforeAll(() => {
  unfake = fakePopovers()
})

afterAll(() => {
  unfake()
})

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) {
    cleanup()
  }
})

/**
 * An open radial menu in the page, with items that note when they run
 * @param {readonly Readonly<{ id: string, when?: () => boolean }>[]} specs - The items' names, and when they apply
 * @returns {Readonly<{ element: HTMLElement, menu: ReturnType<typeof radialMenu>, ran: readonly string[] }>} Its
 *   element, the menu, and what ran
 */
function opened(specs) {
  /** @type {string[]} */
  const ran = []
  const element = document.createElement('div')
  document.body.append(element)
  const items = specs.map(({ id, when }) => ({
    label: id.toUpperCase(),
    run: () => {
      ran.push(id)
    },
    ...(when === undefined ? {} : { when }),
  }))
  const menu = radialMenu({ element, items: () => items })
  cleanups.push(menu.stop, () => {
    element.remove()
  })
  menu.openAt({ x: 100, y: 100 })
  return { element, menu, ran }
}

/**
 * A key going down where focus is, as the menu has it
 * @param {Element} element - The menu
 * @param {string} key - The key
 * @param {KeyboardEventInit} [init] - More of the event
 * @returns {KeyboardEvent} The event
 */
function press(element, key, init = {}) {
  const event = kbd('keydown', { code: key, key, ...init })
  element.dispatchEvent(event)
  return event
}

/**
 * The labels of the slots shown, and which is active
 * @param {Element} element - The menu
 * @returns {readonly (string | undefined)[]} The labels, then the active one's
 */
function slots(element) {
  return [
    ...[...element.querySelectorAll('[role=menuitem]')].map((slot) => slot.textContent),
    element.querySelector('[data-active]')?.textContent ?? undefined,
  ]
}

describe('a radial menu', () => {
  test('is a popover centred on the point while open, showing its first eight items in slots round it', () => {
    const { element, menu } = opened(Array.from({ length: 10 }, (_unused, index) => ({ id: `c${String(index)}` })))
    expect(slots(element)).toEqual(['C0', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', undefined])
    expect([element.matches(':popover-open[role=menu]'), element.popover]).toEqual([true, 'manual'])
    const { height, left, top, translate, width } = element.style
    expect([left, top, translate, width, height]).toEqual(['100px', '100px', '-50% -50%', '264px', '264px'])
    const first = element.querySelector('[role=menuitem]')
    expect(first instanceof HTMLElement ? [first.style.left, first.style.top] : []).toEqual(['100px', '0px'])
    menu.close()
    expect([element.children.length, element.matches(':popover-open')]).toEqual([0, false])
  })

  test('runs the slot an arrow chose on Enter, closing first; Tab goes round', () => {
    const { element, menu, ran } = opened([{ id: 'up' }, { id: 'next' }, { id: 'right' }])
    press(element, 'ArrowRight')
    expect(slots(element).at(-1)).toBe('RIGHT')
    expect(element.getAttribute('aria-activedescendant')).toBe(element.querySelector('[data-active]')?.id ?? '')
    press(element, 'ArrowDown')
    expect(slots(element).at(-1)).toBe('RIGHT')
    let closed = false
    menu.open.watch(() => {
      closed = !menu.open.get() && ran.length === 0
    })
    press(element, 'Enter')
    expect([ran, closed, menu.open.get()]).toEqual([['right'], true, false])
  })

  test('goes round with Tab and Shift+Tab', async () => {
    const { element } = opened([{ id: 'a' }, { id: 'b' }])
    press(element, 'Tab')
    await Bun.sleep(0)
    expect(slots(element).at(-1)).toBe('A')
    press(element, 'Tab', { shiftKey: true })
    await Bun.sleep(0)
    expect(slots(element).at(-1)).toBe('B')
  })

  test('runs a slot clicked, but not one whose item does not apply, which is marked', () => {
    const { element, ran } = opened([{ id: 'yes' }, { id: 'no', when: () => false }])
    expect([...element.querySelectorAll('[aria-disabled=true]')].map((slot) => slot.textContent)).toEqual(['NO'])
    for (const slot of [...element.querySelectorAll('[role=menuitem]')].toReversed()) {
      slot.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    }
    expect(ran).toEqual(['yes'])
  })

  test("closes on Escape, keeps the page's bindings from firing while open, and gives focus back", async () => {
    const outside = mock(() => undefined)
    const stop = keybinds([{ keys: ['Enter', 'Escape'], run: outside }], { target: document })
    cleanups.push(stop)
    const button = document.createElement('button')
    document.body.append(button)
    cleanups.push(() => {
      button.remove()
    })
    button.focus()
    const { element, menu } = opened([{ id: 'one' }])
    await Bun.sleep(0)
    expect(document.activeElement).toBe(element)
    press(element, 'Enter')
    press(element, 'Escape')
    expect([menu.open.get(), outside.mock.calls.length, document.activeElement]).toEqual([false, 0, button])
  })
})
