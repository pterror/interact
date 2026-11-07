/**
 * The bridge between components and a command system. Components know nothing about commands; the bridge needs only
 * two things of a command system, "list the commands available in a context" and "run one by id", and a third if it
 * has it, "tell me when the list may have changed". With that third it is live: menus and buttons follow every change
 * as it happens. Without it they look again when the app says so (`refresh`), and a menu each time it opens.
 *
 * A palette searches the commands. A command system that ranks its own (by how often each is used, say, or on a
 * server) has a fourth, `search`; the bridge asks it, and it may answer later. Without it, the bridge finds commands
 * among those listed by their labels (`matchCommands`).
 * @import { MemorySource } from '@interact/core/memory-source'
 * @import { FoundCommand } from './command-match.js'
 * @import { Menu } from './menu.js'
 * @import { MenuEntry } from './menu-entry.js'
 */

import { Listeners } from '@interact/core'

import { matchCommands } from './command-match.js'
import { menuEntries } from './menu-entry.js'

/**
 * A command as a command system lists it: its id, its name, whether it can run now, and, if it has them, the keys
 * that run it as people read them, the group it is in, and what it does.
 * @typedef {Readonly<{
 *   id: string,
 *   label: string,
 *   enabled: boolean,
 *   shortcut?: string,
 *   category?: string,
 *   description?: string,
 * }>} BridgeCommand
 */

/**
 * What a command system gives the bridge: the commands available in a context (what the context is, the system says:
 * a menu's name, say), running one by id there, and, if it can, hearing when its list may have changed, and finding
 * commands by what was typed, best first, with where each matched, at once or later.
 * @template C
 * @typedef {Readonly<{
 *   list: (context: C) => readonly BridgeCommand[],
 *   run: (id: string, context: C) => boolean,
 *   subscribe?: (listener: () => void) => () => void,
 *   search?: (query: string, context: C) => readonly FoundCommand[] | Promise<readonly FoundCommand[]>,
 * }>} CommandSystem
 */

/**
 * A command system, and everyone following its list: live when the system says when its list changes, otherwise
 * looking again when the app calls `refresh`.
 * @template C
 */
class CommandBridge {
  /**
   * @readonly
   * @type {CommandSystem<C>}
   */
  #system
  /**
   * @readonly
   * @type {Listeners<undefined>}
   */
  #changes = new Listeners()
  /**
   * @readonly
   * @type {(() => void) | undefined}
   */
  #unfollow

  /** @param {CommandSystem<C>} system - The command system */
  constructor(system) {
    this.#system = system
    this.#unfollow = system.subscribe?.(() => {
      this.#changes.emit(undefined)
    })
  }

  /**
   * Stops hearing the system's changes.
   * @returns {void}
   */
  close() {
    this.#unfollow?.()
  }

  /** @returns {boolean} Whether the system says when its list changes, so what follows it is always up to date */
  get live() {
    return this.#system.subscribe !== undefined
  }

  /**
   * The commands available in a context, as the system lists them now.
   * @param {C} context - The context
   * @returns {readonly BridgeCommand[]} The commands
   */
  list(context) {
    return this.#system.list(context)
  }

  /**
   * The commands found for what was typed, in a context, best first: the system's own search if it has one, otherwise
   * those listed whose label has it.
   * @param {string} query - What was typed
   * @param {C} context - The context
   * @returns {readonly FoundCommand[] | Promise<readonly FoundCommand[]>} What was found, at once or later
   */
  search(query, context) {
    return this.#system.search?.(query, context) ?? matchCommands(this.#system.list(context), query)
  }

  /**
   * Runs a command in a context.
   * @param {string} id - The command
   * @param {C} context - The context
   * @returns {boolean} Whether it ran
   */
  run(id, context) {
    return this.#system.run(id, context)
  }

  /**
   * Tells everyone following the list to look again, as the app does when what the commands depend on changed and the
   * system can't say so itself.
   * @returns {void}
   */
  refresh() {
    this.#changes.emit(undefined)
  }

  /**
   * Calls `listener` whenever the list may have changed: when the system says so, or the app does.
   * @param {() => void} listener - What to call
   * @returns {() => void} Stops calling it
   */
  subscribe(listener) {
    return this.#changes.add(() => {
      listener()
    })
  }
}

/**
 * A command as a menu entry: run when chosen, disabled while it can't run.
 * @param {BridgeCommand} command - The command
 * @returns {MenuEntry} The entry
 */
function commandEntry(command) {
  const shown = command.shortcut === undefined ? {} : { shortcut: command.shortcut }
  return { disabled: !command.enabled, id: command.id, kind: 'command', label: command.label, ...shown }
}

/**
 * Brings a source of entries in line with a list, position by position, so an item that stays where it was stays
 * active: those both have are replaced, then what is new is added at the end or what is gone taken off it.
 * @param {MemorySource<MenuEntry>} source - The menu's entries
 * @param {readonly MenuEntry[]} entries - What they should be
 * @returns {void}
 */
function updateEntries(source, entries) {
  const before = source.count()
  const shared = Math.min(before, entries.length)
  if (shared > 0) {
    source.replace(0, entries.slice(0, shared))
  }
  if (entries.length > before) {
    source.insert(before, entries.slice(before))
  } else if (entries.length < before) {
    source.remove(entries.length, before)
  }
}

/**
 * Makes a menu show the commands available in a context, and run the one chosen: its entries are listed when it opens,
 * and again whenever the bridge says the list may have changed while it is open. A command chosen runs in the context
 * it was chosen in, once the menu has gone and focus is back where it was, so it acts on what the person was on.
 * @template C
 * @param {Menu} menu - The menu, made with no entries of its own
 * @param {CommandBridge<C>} bridge - The bridge to the command system
 * @param {() => C} context - The context the menu's commands are listed and run in, as it is when asked
 * @returns {() => void} Stops
 */
function showCommands(menu, bridge, context) {
  const source = menuEntries(bridge.list(context()).map((command) => commandEntry(command)))
  menu.setItems(source)
  /** @returns {void} */
  function relist() {
    updateEntries(
      source,
      bridge.list(context()).map((command) => commandEntry(command)),
    )
  }
  const stops = [
    menu.layer.open.subscribe((open) => {
      if (open) {
        relist()
      }
    }),
    bridge.subscribe(() => {
      if (menu.layer.open.get()) {
        relist()
      }
    }),
    menu.onSelect(({ entry }) => {
      const at = context()
      menu.layer.afterHidden(() => {
        bridge.run(entry.id, at)
      })
    }),
  ]
  return () => {
    for (const stop of stops) {
      stop()
    }
  }
}

export { CommandBridge, showCommands }
