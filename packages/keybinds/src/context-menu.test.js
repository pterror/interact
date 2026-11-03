/**
 * @import { Command } from './command.js'
 */

import { afterEach, describe, expect, mock, test } from 'bun:test'

import { ContextMenu } from './context-menu.js'
import { createComponent } from './create-component.js'
import { partOf, textsOf, typeInto } from './test-components.js'
import { kbd, keybinds } from './test-helpers.js'

const FIRST = 0
const LABELS = '.context-menu__item-label'
const MORE = '.context-menu__more-row'
const MANY = 15
const FEW = 5
const ENOUGH = 7
const SOME = 10
const MORE_THAN_THREE = 20
const THREE = 3
const TOP = 10
const LOW = 1

/** @type {Element[]} */
const placed = []

afterEach(() => {
  for (const element of placed.splice(FIRST)) {
    element.remove()
  }
})

/**
 * Puts an element in the page until the test ends
 * @template {Element} E
 * @param {E} element - The element
 * @returns {E} The same element
 */
function place(element) {
  document.body.append(element)
  placed.push(element)
  return element
}

/**
 * A command that does nothing
 * @param {string} id - Its id
 * @param {string} label - Its label
 * @returns {Command} The command
 */
function command(id, label) {
  return { execute: () => undefined, id, label }
}

/**
 * Commands named by number
 * @param {number} count - How many
 * @returns {Command[]} Command 0, Command 1, ...
 */
function numbered(count) {
  return Array.from({ length: count }, (_slot, index) => command(`cmd${index}`, `Command ${index}`))
}

/**
 * A menu in the page until the test ends, with commands
 * @param {readonly Command[]} commands - Its commands
 * @returns {ContextMenu} The menu, not yet open
 */
function menuOf(commands) {
  const menu = place(createComponent(ContextMenu))
  menu.commands = commands
  return menu
}

/**
 * A scorer that puts the command "b" on top
 * @param {Command} scored - The command
 * @returns {number} Its score
 */
function bFirst(scored) {
  return scored.id === 'b' ? TOP : LOW
}

describe('an open scored menu', () => {
  test('shows the top seven, and a row saying how many more there are', () => {
    const menu = menuOf(numbered(SOME))
    menu.open = true
    expect(textsOf(menu, LABELS)).toHaveLength(ENOUGH)
    expect(textsOf(menu, MORE)).toEqual(['▾ 3 more'])
  })

  test('shows every command, without that row, when they fit', () => {
    const few = menuOf(numbered(FEW))
    few.open = true
    expect(textsOf(few, LABELS)).toHaveLength(FEW)
    const enough = menuOf(numbered(ENOUGH))
    enough.open = true
    expect(textsOf(enough, MORE)).toEqual([])
  })

  test('shows as many as maxVisible says', () => {
    const menu = menuOf(numbered(MORE_THAN_THREE))
    menu.maxVisible = THREE
    menu.open = true
    expect(textsOf(menu, LABELS)).toHaveLength(THREE)
  })

  test('shows the rest when the row is pointed at', () => {
    const menu = menuOf(numbered(MANY))
    menu.open = true
    partOf(menu, MORE, HTMLElement).dispatchEvent(new MouseEvent('mouseenter'))
    expect(textsOf(menu, LABELS)).toHaveLength(MANY)
    expect(textsOf(menu, MORE)).toEqual([])
  })
})

describe('what an open scored menu shows', () => {
  test('is searched as its field, a part named search, is typed into', () => {
    const menu = menuOf([
      command('save', 'Save document'),
      command('open', 'Open file'),
      command('copy', 'Copy selection'),
      command('find', 'Find in document'),
    ])
    menu.maxVisible = THREE
    menu.open = true
    typeInto(partOf(menu, '[part~="search"]', HTMLInputElement), 'document')
    expect(textsOf(menu, LABELS)).toEqual(['Save document', 'Find in document'])
  })

  test('is ranked by its scorer', () => {
    const menu = menuOf([command('a', 'Alpha'), command('b', 'Beta')])
    menu.scorer = bFirst
    menu.open = true
    expect(textsOf(menu, LABELS)).toEqual(['Beta', 'Alpha'])
  })

  test('is ranked by its history with the default scorer, what ran lately first', () => {
    const menu = menuOf([command('a', 'Alpha'), command('b', 'Beta')])
    menu.history = [{ id: 'b', timestamp: Date.now() }]
    menu.open = true
    expect(textsOf(menu, LABELS)).toEqual(['Beta', 'Alpha'])
  })
})

describe('an open scored menu in the page', () => {
  test('keeps its keys: Enter picks its item, not a command bound to Enter', () => {
    const target = place(document.createElement('div'))
    const execute = mock(() => undefined)
    const stop = keybinds([{ execute, id: 'go', keys: ['Enter'], label: 'Go' }], undefined, { target })
    const menu = createComponent(ContextMenu)
    target.append(menu)
    menu.open = true
    menu.dispatchEvent(kbd('keydown', { code: 'Enter', key: 'Enter' }))
    expect(execute).not.toHaveBeenCalled()
    stop()
  })
})
