import { afterAll, afterEach, beforeAll, describe, expect, mock, test } from 'bun:test'

import { cell } from '@pterror/interact-list'

import { cheatsheet } from './cheatsheet.js'
import { keybinds } from './keybinds.js'
import { kbd } from './test-keys.js'
import { fakePopovers } from './test-popover.js'

const HOLD = 10

/**
 * A layout whose Slash key types "-"
 * @returns {ReadonlyMap<string, string> | undefined} The layout
 */
function dashOnSlash() {
  return new Map([['Slash', '-']])
}
const LONGER = 30

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

const SCHEMA = {
  internal: { hidden: true, keys: ['x'], label: 'Internal' },
  look: { axes: ['mouse:x', '-pad:ry'], category: 'View', label: 'Look' },
  quit: { keys: ['ctrl+q'], label: 'Quit' },
  save: { category: 'File', keys: ['ctrl+s', 'g s'], label: 'Save', mouse: ['ctrl+click:up'] },
  unbound: { label: 'Unbound' },
}

/**
 * A cheatsheet in the page, opened by Control held a short while on a fresh element
 * @param {Partial<Parameters<typeof cheatsheet>[0]>} [options] - More options
 * @returns {Readonly<{ element: HTMLElement, open: ReturnType<typeof cheatsheet>['open'], target: HTMLElement }>}
 *   Its element, whether it is open, and where its modifier is pressed
 */
function sheet(options = {}) {
  const element = document.createElement('div')
  const target = document.createElement('div')
  document.body.append(element, target)
  const made = cheatsheet({ delay: HOLD, element, modifier: 'Control', schema: SCHEMA, target, ...options })
  cleanups.push(made.stop, () => {
    element.remove()
    target.remove()
  })
  return { element, open: made.open, target }
}

/**
 * A key event on a target
 * @param {EventTarget} target - Where
 * @param {string} type - "keydown" or "keyup"
 * @param {string} name - The key
 * @param {KeyboardEventInit} [init] - More of the event
 * @returns {void}
 */
function key(target, type, name, init = {}) {
  target.dispatchEvent(kbd(type, { key: name, ...init }))
}

/**
 * Taps a modifier: down and up again
 * @param {EventTarget} target - Where
 * @param {string} modifier - The modifier
 * @returns {void}
 */
function tap(target, modifier) {
  key(target, 'keydown', modifier)
  key(target, 'keyup', modifier)
}

/**
 * What a cheatsheet shows: each group's header, and each row's label and bindings' parts
 * @param {Element} element - The cheatsheet
 * @returns {readonly (readonly unknown[])[]} Each group, its header first
 */
function shown(element) {
  return [...element.querySelectorAll('[role=group]')].map((group) => [
    group.querySelector(`#${group.getAttribute('aria-labelledby') ?? ''}`)?.textContent,
    ...[...group.children]
      .slice(1)
      .map((row) => [
        row.firstElementChild?.textContent,
        ...[...(row.lastElementChild?.children ?? [])].map((binding) =>
          [...binding.children].map((part) => part.textContent),
        ),
      ]),
  ])
}

describe('holding the modifier', () => {
  test('opens the cheatsheet for the chosen modifier, after the chosen time, until let go', async () => {
    const { element, open, target } = sheet({ modifier: 'Alt' })
    key(target, 'keydown', 'Control')
    await Bun.sleep(LONGER)
    expect([open.get(), element.matches(':popover-open')]).toEqual([false, false])
    key(target, 'keyup', 'Control')
    key(target, 'keydown', 'Alt')
    await Bun.sleep(LONGER)
    expect([open.get(), element.matches(':popover-open')]).toEqual([true, true])
    key(target, 'keyup', 'Alt')
    expect(open.get()).toBe(false)
  })

  test('closes when another key is pressed', async () => {
    const { open, target } = sheet()
    key(target, 'keydown', 'Control')
    await Bun.sleep(LONGER)
    expect(open.get()).toBe(true)
    key(target, 'keydown', 'k', { ctrlKey: true })
    expect(open.get()).toBe(false)
    key(target, 'keyup', 'Control')
  })
})

describe('tapping the modifier', () => {
  test('twice keeps it open; twice again closes it', () => {
    const { open, target } = sheet()
    tap(target, 'Control')
    expect(open.get()).toBe(false)
    tap(target, 'Control')
    expect(open.get()).toBe(true)
    tap(target, 'Control')
    tap(target, 'Control')
    expect(open.get()).toBe(false)
  })

  test('twice keeps it open until Escape, or a press outside', () => {
    const { open, target } = sheet()
    tap(target, 'Control')
    tap(target, 'Control')
    key(document, 'keydown', 'Escape')
    expect(open.get()).toBe(false)
    tap(target, 'Control')
    tap(target, 'Control')
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    expect(open.get()).toBe(false)
  })
})

describe('an open cheatsheet', () => {
  test("is a popover centred on the viewport that has focus, so the page's bindings don't fire", async () => {
    const outside = mock(() => undefined)
    cleanups.push(keybinds([{ keys: ['ctrl+k'], run: outside }], { target: document }))
    const { element, open } = sheet()
    open.set(true)
    await Bun.sleep(0)
    const { left, top, translate } = element.style
    expect([element.popover, left, top, translate, document.activeElement]).toEqual([
      'manual',
      `${String(window.innerWidth / 2)}px`,
      `${String(window.innerHeight / 2)}px`,
      '-50% -50%',
      element,
    ])
    element.dispatchEvent(kbd('keydown', { code: 'KeyK', ctrlKey: true, key: 'k' }))
    expect(outside).not.toHaveBeenCalled()
  })

  test("shows each category's bindings under its header, axes too, leaving out hidden and unbound ids", () => {
    const { element, open } = sheet()
    expect(element.children).toHaveLength(0)
    open.set(true)
    expect(shown(element)).toEqual([
      ['View', ['Look', ['Mouse ↔'], ['Right stick ↕', 'Inverted']]],
      ['Other', ['Quit', ['Ctrl', 'Q']]],
      ['File', ['Save', ['Ctrl', 'S'], ['G', 'then', 'S'], ['Ctrl', 'Click', 'Release']]],
    ])
  })

  test('marks the ids whose command does not apply now, as of opening', () => {
    let ready = false
    const { element, open } = sheet({ applies: (id) => id !== 'save' || ready })
    open.set(true)
    const disabled = () =>
      [...element.querySelectorAll('[aria-disabled=true]')].map((row) => row.firstElementChild?.textContent)
    expect(disabled()).toEqual(['Save'])
    ready = true
    open.set(false)
    open.set(true)
    expect(disabled()).toEqual([])
  })

  test("shows a person's overrides as they change, and keys as the layout types them", () => {
    const overrides = cell({})
    const layout = cell(dashOnSlash())
    const { element, open } = sheet({ layout, overrides, schema: { find: { keys: ['slash'], label: 'Find' } } })
    open.set(true)
    expect(shown(element)).toEqual([['Other', ['Find', ['-']]]])
    overrides.set({ find: { keys: ['ctrl+f'], mouse: ['back'] } })
    expect(shown(element)).toEqual([['Other', ['Find', ['Ctrl', 'F'], ['Back']]]])
    overrides.set({ find: { keys: ['slash'] } })
    layout.set(undefined)
    expect(shown(element)).toEqual([['Other', ['Find', ['/']]]])
  })
})
