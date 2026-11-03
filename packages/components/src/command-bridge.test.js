/**
 * @import { Span } from '@interact/core/memory-source'
 * @import { BridgeCommand, CommandSystem } from './command-bridge.js'
 */

import { describe, expect, test } from 'bun:test'

import { Listeners } from '@interact/core'

import { CommandBridge, showCommands } from './command-bridge.js'
import { bindCommandButtons } from './command-buttons.js'
import { menuKey } from './menu-keys.js'
import { Menu } from './menu.js'

/** @type {Readonly<{ direction: 'ltr' | 'rtl', modifiers: Readonly<{ shift: boolean, toggle: boolean }> }>} */
const PLAIN = { direction: 'ltr', modifiers: { shift: false, toggle: false } }
const SECOND = 1

/**
 * A command system for the tests: commands in a list the test changes, which it can say has changed, or not.
 * @param {boolean} live - Whether it says when its list changes
 * @returns {Readonly<{ system: CommandSystem<string>, set: (commands: readonly BridgeCommand[]) => void, ran: string[] }>}
 *   The system, a way to change its commands, and the ids it ran, each with its context
 */
function commands(live) {
  /** @type {readonly BridgeCommand[]} */
  let list = [
    { enabled: true, id: 'save', label: 'Save', shortcut: 'Ctrl+S' },
    { enabled: false, id: 'undo', label: 'Undo' },
  ]
  /** @type {string[]} */
  const ran = []
  /** @type {Listeners<undefined>} */
  const changes = new Listeners()
  return {
    ran,
    set: (next) => {
      list = next
      changes.emit(undefined)
    },
    system: {
      list: () => list,
      run: (id, context) => {
        ran.push(`${id} in ${context}`)
        return true
      },
      ...(live ? { subscribe: (listener) => changes.add(listener) } : {}),
    },
  }
}

/**
 * A menu showing a system's commands in the "edit" context.
 * @param {boolean} live - Whether the system says when its list changes
 * @returns {Readonly<{ menu: Menu<Span>, bridge: CommandBridge<string> } & ReturnType<typeof commands>>} The menu, the
 *   bridge, and the system
 */
function commandMenu(live) {
  const made = commands(live)
  const bridge = new CommandBridge(made.system)
  /** @type {Menu<Span>} */
  const menu = new Menu({ id: 'commands' })
  showCommands(menu, bridge, () => 'edit')
  return { ...made, bridge, menu }
}

/**
 * The labels a menu shows, and which are disabled.
 * @param {Menu<Span>} menu - The menu
 * @returns {string[]} Each label, with "(off)" after a disabled one
 */
function labels(menu) {
  return Array.from({ length: menu.list.items.count }, (_skip, position) => {
    const entry = menu.list.items.item(position)
    return entry?.kind === 'command' ? `${entry.label}${entry.disabled === true ? ' (off)' : ''}` : '?'
  })
}

describe('a menu of commands', () => {
  test('shows the commands, disabled where they cannot run, and runs the one chosen in its context', () => {
    const { menu, ran } = commandMenu(true)
    menu.open()
    const shown = labels(menu)
    menuKey(menu, 'Enter', PLAIN)
    expect([shown, ran, menu.layer.open.get()]).toEqual([['Save', 'Undo (off)'], ['save in edit'], false])
  })

  test('follows a live system while open, keeping the active item', () => {
    const { menu, set } = commandMenu(true)
    menu.open()
    menuKey(menu, 'ArrowDown', PLAIN)
    set([
      { enabled: true, id: 'save', label: 'Save' },
      { enabled: true, id: 'undo', label: 'Undo' },
      { enabled: true, id: 'redo', label: 'Redo' },
    ])
    expect([labels(menu), menu.list.active.get()]).toEqual([['Save', 'Undo', 'Redo'], SECOND])
  })

  test('looks again when it opens, or when the app says so, if the system cannot say', () => {
    const { bridge, menu, set } = commandMenu(false)
    set([{ enabled: true, id: 'save', label: 'Save' }])
    const before = labels(menu)
    menu.open()
    const opened = labels(menu)
    set([{ enabled: true, id: 'print', label: 'Print' }])
    const unheard = labels(menu)
    bridge.refresh()
    expect([before, opened, unheard, labels(menu), bridge.live]).toEqual([
      ['Save', 'Undo (off)'],
      ['Save'],
      ['Save'],
      ['Print'],
      false,
    ])
  })
})

/**
 * Whether each command button under a root is disabled: a button by its `disabled`, anything else by `aria-disabled`.
 * @param {HTMLElement} root - Where the buttons are
 * @returns {boolean[]} Whether each is
 */
function disabled(root) {
  return [...root.querySelectorAll('[data-command]')].map((button) =>
    button instanceof HTMLButtonElement ? button.disabled : button.hasAttribute('aria-disabled'),
  )
}

/**
 * Presses the command button for a command under a root.
 * @param {HTMLElement} root - Where the buttons are
 * @param {string} id - The command
 * @returns {void}
 */
function pressButton(root, id) {
  const button = root.querySelector(`[data-command="${id}"]`)
  if (button instanceof HTMLElement) {
    button.click()
  }
}

/**
 * A toolbar of command buttons in the page: a button for save, and something else for undo.
 * @returns {HTMLElement} The toolbar
 */
function toolbar() {
  const root = document.createElement('div')
  root.innerHTML = '<button data-command="save">Save</button><span data-command="undo">Undo</span>'
  document.body.replaceChildren(root)
  return root
}

describe('command buttons', () => {
  test('are disabled while their command cannot run, follow the system, and run their command when pressed', () => {
    const { ran, set, system } = commands(true)
    const root = toolbar()
    const stop = bindCommandButtons(root, new CommandBridge(system), () => 'toolbar')
    const before = disabled(root)
    set([{ enabled: false, id: 'save', label: 'Save' }])
    const after = disabled(root)
    set([{ enabled: true, id: 'save', label: 'Save' }])
    pressButton(root, 'save')
    stop()
    expect([before, after, ran]).toEqual([[false, true], [true, true], ['save in toolbar']])
  })
})
