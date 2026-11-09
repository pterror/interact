/**
 * @import { Command, Context } from './command.js'
 */

import { afterEach, describe, expect, test } from 'bun:test'

import { KeybindCheatsheet, groupByCategory } from './cheatsheet.js'
import { elementOf, textsOf } from './test-components.js'

const HOLD = 10
const LONGER = 30
const FIRST = 0

/** @type {Element[]} */
const placed = []

afterEach(() => {
  for (const element of placed.splice(FIRST)) {
    element.remove()
  }
})

/**
 * A key event on the window
 * @param {string} type - "keydown" or "keyup"
 * @param {string} name - The key
 * @param {KeyboardEventInit} [init] - More of the event
 * @returns {void}
 */
function key(type, name, init = {}) {
  globalThis.dispatchEvent(new KeyboardEvent(type, { key: name, ...init }))
}

/**
 * Taps a modifier: down and up again
 * @param {string} modifier - The modifier
 * @returns {void}
 */
function tap(modifier) {
  key('keydown', modifier)
  key('keyup', modifier)
}

/**
 * A cheatsheet in the page that opens while a modifier is held a short while
 * @param {string} modifier - The modifier
 * @returns {KeybindCheatsheet} The cheatsheet
 */
function sheet(modifier) {
  const element = elementOf('keybinds-cheatsheet', KeybindCheatsheet)
  element.setAttribute('trigger-key', modifier)
  element.setAttribute('trigger-delay', String(HOLD))
  element.toggleAttribute('auto-trigger', true)
  document.body.append(element)
  placed.push(element)
  return element
}

describe('holding the trigger modifier', () => {
  test('opens the cheatsheet for the chosen modifier, after the chosen time, until let go', async () => {
    const element = sheet('Alt')
    key('keydown', 'Control')
    await Bun.sleep(LONGER)
    expect(element.open).toBe(false)
    key('keyup', 'Control')
    key('keydown', 'Alt')
    await Bun.sleep(LONGER)
    expect(element.open).toBe(true)
    key('keyup', 'Alt')
    expect(element.open).toBe(false)
  })

  test("is spoiled by a shortcut, and the modifier's auto-repeat doesn't start it again", async () => {
    const element = sheet('Control')
    key('keydown', 'Control')
    key('keydown', 'b', { ctrlKey: true })
    key('keyup', 'b', { ctrlKey: true })
    key('keydown', 'Control', { repeat: true })
    await Bun.sleep(LONGER)
    expect(element.open).toBe(false)
    key('keyup', 'Control')
  })

  test.each(['pointerdown', 'wheel'])('is spoiled by a %s while holding', async (type) => {
    const element = sheet('Control')
    key('keydown', 'Control')
    globalThis.dispatchEvent(new Event(type))
    await Bun.sleep(LONGER)
    expect(element.open).toBe(false)
    key('keyup', 'Control')
  })

  test('closes when another key is pressed', async () => {
    const element = sheet('Control')
    key('keydown', 'Control')
    await Bun.sleep(LONGER)
    expect(element.open).toBe(true)
    key('keydown', 'k', { ctrlKey: true })
    expect(element.open).toBe(false)
    key('keyup', 'Control')
  })
})

describe('tapping the trigger modifier', () => {
  test('twice keeps it open; twice again closes it', () => {
    const element = sheet('Control')
    tap('Control')
    expect(element.open).toBe(false)
    tap('Control')
    expect(element.open).toBe(true)
    tap('Control')
    tap('Control')
    expect(element.open).toBe(false)
  })

  test('twice keeps it open until Escape', () => {
    const element = sheet('Control')
    tap('Control')
    tap('Control')
    key('keydown', 'Escape')
    expect(element.open).toBe(false)
  })

  test('does not count a tap that was part of a shortcut', () => {
    const element = sheet('Control')
    tap('Control')
    key('keydown', 'Control')
    key('keydown', 'c', { ctrlKey: true })
    key('keyup', 'Control')
    tap('Control')
    expect(element.open).toBe(false)
  })
})

describe('an open cheatsheet', () => {
  test("shows each category's commands, with their bindings", () => {
    const element = sheet('Control')
    element.commands = [
      { category: 'File', execute: () => undefined, id: 'save', keys: ['ctrl+s'], label: 'Save' },
      { execute: () => undefined, id: 'quit', keys: ['ctrl+q'], label: 'Quit' },
    ]
    element.open = true
    expect(textsOf(element, '.cheatsheet__group-title')).toEqual(['File', 'Other'])
    expect(textsOf(element, '.cheatsheet__item-label')).toEqual(['Save', 'Quit'])
    expect(textsOf(element, '.cheatsheet__item-key')).toEqual(['Ctrl', 'S', 'Ctrl', 'Q'])
  })
})

/**
 * A command that does nothing
 * @param {Omit<Command, 'execute'>} fields - Everything but what it does
 * @returns {Command} The command
 */
function commandWith(fields) {
  return { ...fields, execute: () => undefined }
}

/**
 * The ids of some grouped commands, in order
 * @param {readonly Readonly<{ command: Command }>[]} [entries] - The entries, none if missing
 * @returns {string[]} Their ids
 */
function ids(entries = []) {
  return entries.map(({ command }) => command.id)
}

/**
 * A `when` reading whether the context is ready
 * @param {Context} context - The app's state
 * @returns {boolean} Whether `ready` is true
 */
function whenReady(context) {
  return context['ready'] === true
}

describe('grouping the commands shown', () => {
  const GROUPED = [
    commandWith({ category: 'File', id: 'save', keys: ['$mod+s'], label: 'Save document' }),
    commandWith({ category: 'File', id: 'open', keys: ['$mod+o'], label: 'Open file' }),
    commandWith({ category: 'Edit', id: 'delete', keys: ['Backspace'], label: 'Delete' }),
    commandWith({ id: 'misc', keys: ['m'], label: 'Misc' }),
  ]

  test('groups by category, "Other" for none', () => {
    const groups = groupByCategory(GROUPED)
    expect(Object.keys(groups).toSorted()).toEqual(['Edit', 'File', 'Other'])
    expect(ids(groups['Other'])).toEqual(['misc'])
  })

  test('leaves out hidden and unbound commands, and takes the last under an id', () => {
    const groups = groupByCategory([
      ...GROUPED,
      commandWith({ hidden: true, id: 'h', keys: ['h'], label: 'H' }),
      commandWith({ id: 'u', label: 'U' }),
      commandWith({ category: 'File', id: 'save', keys: ['$mod+s'], label: 'Save v2' }),
    ])
    expect(ids(Object.values(groups).flat())).not.toContain('h')
    expect(ids(Object.values(groups).flat())).not.toContain('u')
    expect(groups['File']?.map(({ command }) => command.label)).toEqual(['Save v2', 'Open file'])
  })

  test('says whether each command applies', () => {
    const groups = groupByCategory([commandWith({ id: 'a', keys: ['a'], label: 'A', when: whenReady })], {
      ready: false,
    })
    expect(groups['Other']?.[FIRST]?.active).toBe(false)
  })
})
