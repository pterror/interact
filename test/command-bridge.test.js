/**
 * The keybinds CommandHub driving `@interact/components`' menus and command buttons through the command bridge: neither
 * package imports the other; the hub's `commandSystem()` has the shape the bridge asks for.
 * @import { Span } from '@interact/core/memory-source'
 * @import { Command } from 'keybinds/command'
 * @import { CommandSystem } from 'keybinds/command-system'
 */

import { describe, expect, test } from 'bun:test'

import { CommandBridge, Menu, bindCommandButtons, menuKey, showCommands } from '@interact/components'
import { CommandHub } from 'keybinds'

/** @type {Readonly<{ direction: 'ltr' | 'rtl', modifiers: Readonly<{ shift: boolean, toggle: boolean }> }>} */
const PLAIN = { direction: 'ltr', modifiers: { shift: false, toggle: false } }

/**
 * A hub with a paste command that applies only while there is something to paste, and a copy command, both in the
 * edit menu, with whether there is something to paste and what ran.
 * @returns {Readonly<{ hub: CommandHub, ran: readonly string[], fill: () => void }>} The hub, what ran, and a way to
 *   give it something to paste
 */
function editingHub() {
  let clipboard = false
  /** @type {string[]} */
  const ran = []
  const hub = new CommandHub({ context: () => ({ clipboard }), listen: { target: document.createElement('div') } })
  /** @type {readonly Command[]} */
  const commands = [
    { execute: () => ran.push('copy'), id: 'copy', label: 'Copy', menu: 'edit' },
    {
      execute: () => ran.push('paste'),
      id: 'paste',
      label: 'Paste',
      menu: 'edit',
      when: (now) => now['clipboard'] === true,
    },
  ]
  hub.setSource('editor', () => commands)
  hub.refresh()
  return {
    fill: () => {
      clipboard = true
      hub.syncContext()
    },
    hub,
    ran,
  }
}

/**
 * Whether each entry in a menu is disabled.
 * @param {Menu<Span>} menu - The menu
 * @returns {(boolean | undefined)[]} Whether each is
 */
function disabledEntries(menu) {
  return Array.from({ length: menu.list.items.count }, (_skip, position) => {
    const entry = menu.list.items.item(position)
    return entry?.kind === 'command' ? entry.disabled : undefined
  })
}

/**
 * A menu showing a hub's edit commands through the bridge, open.
 * @param {CommandSystem} system - The hub as a command system
 * @returns {Readonly<{ menu: Menu<Span>, live: boolean }>} The menu, and whether the bridge is live
 */
function editMenu(system) {
  const bridge = new CommandBridge(system)
  /** @type {Menu<Span>} */
  const menu = new Menu({ id: 'edit' })
  showCommands(menu, bridge, () => 'edit')
  menu.open()
  return { live: bridge.live, menu }
}

/**
 * A toolbar with a paste button whose command buttons follow a hub through the bridge.
 * @param {CommandSystem} system - The hub as a command system
 * @returns {Readonly<{ button: HTMLButtonElement, stop: () => void }>} The button, and a way to stop
 */
function pasteButton(system) {
  const root = document.createElement('div')
  const button = document.createElement('button')
  button.dataset['command'] = 'paste'
  button.textContent = 'Paste'
  root.append(button)
  document.body.replaceChildren(root)
  return { button, stop: bindCommandButtons(root, new CommandBridge(system), () => undefined) }
}

describe('a keybinds hub through the command bridge', () => {
  test('fills a menu with its edit commands, follows its context while open, and runs what is chosen', () => {
    const { fill, hub, ran } = editingHub()
    const { live, menu } = editMenu(hub.commandSystem())
    const before = disabledEntries(menu)
    fill()
    const after = disabledEntries(menu)
    menuKey(menu, 'ArrowDown', PLAIN)
    menuKey(menu, 'Enter', PLAIN)
    expect([live, before, after, ran, menu.layer.open.get()]).toEqual([
      true,
      [false, true],
      [false, false],
      ['paste'],
      false,
    ])
    hub.destroy()
  })

  test('keeps command buttons in step with the hub, and runs theirs', () => {
    const { fill, hub, ran } = editingHub()
    const { button, stop } = pasteButton(hub.commandSystem())
    const before = button.disabled
    fill()
    button.click()
    stop()
    expect([before, button.disabled, ran]).toEqual([true, false, ['paste']])
    hub.destroy()
  })
})
