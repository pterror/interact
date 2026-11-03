/**
 * Menus for the tests: a source of entries, a clock that waits only when told, and a menu of each kind of entry with a
 * submenu, the same on the server and in the page.
 * @import { Span } from '@interact/core/memory-source'
 * @import { MenuEntry } from './menu-entry.js'
 * @import { Wait } from './menu-types.js'
 */

import { MemorySource } from '@interact/core'

import { Menu } from './menu.js'

/**
 * Entries in a source, keyed by their ids.
 * @param {readonly MenuEntry<Span>[]} list - The entries
 * @returns {MemorySource<MenuEntry<Span>>} The source
 */
function entries(list) {
  return new MemorySource(list, (entry) => entry.id)
}

/**
 * The submenu open from a menu.
 * @param {Menu<Span>} menu - The menu
 * @returns {Menu<Span>} Its submenu
 * @throws {Error} If none is open
 */
function submenuOf(menu) {
  const open = menu.submenu
  if (open === undefined) {
    throw new Error('No submenu is open')
  }
  return open.menu
}

/**
 * A clock that waits only when told: what is waiting runs on `run`.
 * @returns {Readonly<{ wait: Wait, run: () => void, waiting: () => number }>} The wait, a way to end every wait, and
 *   how many are waiting
 */
function manualWait() {
  /** @type {Set<() => void>} */
  const waiting = new Set()
  return {
    run: () => {
      const due = [...waiting]
      waiting.clear()
      for (const run of due) {
        run()
      }
    },
    wait: (_milliseconds, run) => {
      waiting.add(run)
      return () => {
        waiting.delete(run)
      }
    },
    waiting: () => waiting.size,
  }
}

/**
 * An edit menu: commands with a separator between, a disabled one, checkbox and radio items, and a submenu.
 * @returns {readonly MenuEntry<Span>[]} Its entries
 */
function editEntries() {
  return [
    { id: 'cut', kind: 'command', label: 'Cut', shortcut: 'Ctrl+X' },
    { id: 'copy', kind: 'command', label: 'Copy', shortcut: 'Ctrl+C' },
    { disabled: true, id: 'paste', kind: 'command', label: 'Paste' },
    { id: 'line', kind: 'separator' },
    { checked: true, id: 'wrap', kind: 'checkbox', label: 'Wrap lines' },
    {
      id: 'share',
      items: entries([
        { id: 'mail', kind: 'command', label: 'Mail' },
        { id: 'link', kind: 'command', label: 'Copy link' },
      ]),
      kind: 'submenu',
      label: 'Share',
    },
    { id: 'line2', kind: 'separator' },
    { checked: true, id: 'small', kind: 'radio', label: 'Small' },
    { checked: false, id: 'large', kind: 'radio', label: 'Large' },
  ]
}

/**
 * The edit menu, waiting by `wait`.
 * @param {Wait} [wait] - How it waits
 * @returns {Menu<Span>} The menu
 */
function editMenu(wait) {
  return new Menu({ id: 'edit', items: entries(editEntries()), label: 'Edit', ...(wait ? { wait } : {}) })
}

export { editEntries, editMenu, entries, manualWait, submenuOf }
