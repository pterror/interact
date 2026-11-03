/**
 * A CommandHub as a command system (`hub.commandSystem()`), for a bridge that keeps menus, a palette and buttons in
 * step with it, such as `@interact/components`' CommandBridge: it has the shape such a bridge asks for, and imports
 * nothing of it.
 * @import { CommandDefinition } from './hub-commands.js'
 */

/**
 * A command as the system lists it: its id and name, whether it applies now, and, if it has them, its first key binding
 * as people read it, its group and what it does.
 * @typedef {Readonly<{
 *   id: string,
 *   label: string,
 *   enabled: boolean,
 *   shortcut?: string,
 *   category?: string,
 *   description?: string,
 * }>} SystemCommand
 */

/**
 * A hub as a command system: the commands available in a context (a menu's tag, or undefined for every command), running
 * one, and hearing when which apply may have changed.
 * @typedef {Readonly<{
 *   list: (tag: string | undefined) => readonly SystemCommand[],
 *   run: (id: string) => boolean,
 *   subscribe: (listener: () => void) => () => void,
 * }>} CommandSystem
 */

/**
 * What a hub gives its command system: its definitions, whether one applies now, its key bindings as people read them,
 * a way to hear its context synced, and running one.
 * @template {CommandDefinition} D
 * @typedef {Readonly<{
 *   all: () => readonly D[],
 *   applies: (id: string) => boolean,
 *   keys: (id: string) => readonly string[],
 *   listen: (listener: () => void) => () => void,
 *   run: (id: string) => boolean,
 * }>} HubOperations
 */

const FIRST = 0

/**
 * Whether a definition is in a menu: with no tag, every definition is; with one, those whose `menu` is or includes it.
 * @param {CommandDefinition} definition - The definition
 * @param {string | undefined} tag - The menu's tag, if any
 * @returns {boolean} Whether it is listed there
 */
function inMenu(definition, tag) {
  if (tag === undefined) {
    return true
  }
  const menu = 'menu' in definition ? definition.menu : undefined
  return menu === tag || (Array.isArray(menu) && menu.includes(tag))
}

/**
 * A definition as the system lists it.
 * @template {CommandDefinition} D
 * @param {HubOperations<D>} hub - What the hub gives
 * @param {D} definition - The definition
 * @returns {SystemCommand} The command
 */
function listed(hub, definition) {
  const shortcut = hub.keys(definition.id).at(FIRST)
  return {
    enabled: hub.applies(definition.id),
    id: definition.id,
    label: definition.label,
    ...(shortcut === undefined ? {} : { shortcut }),
    ...(definition.category === undefined ? {} : { category: definition.category }),
    ...(definition.description === undefined ? {} : { description: definition.description }),
  }
}

/**
 * A hub as a command system. Hidden commands are never listed; each command is enabled while it applies; it says its
 * list may have changed whenever the hub's context is synced, which refreshing does too, so a bridge following it is
 * live.
 * @template {CommandDefinition} D
 * @param {HubOperations<D>} hub - What the hub gives
 * @returns {CommandSystem} The command system
 */
function systemOf(hub) {
  return {
    list: (tag) =>
      hub
        .all()
        .filter((definition) => definition.hidden !== true && inMenu(definition, tag))
        .map((definition) => listed(hub, definition)),
    run: (id) => hub.run(id),
    subscribe: (listener) => hub.listen(listener),
  }
}

/**
 * Calls `listener` on each event of a type, until stopped.
 * @param {EventTarget} target - What the events happen on
 * @param {string} type - Which events
 * @param {() => void} listener - What to call
 * @returns {() => void} Stops calling it
 */
function listenFor(target, type, listener) {
  target.addEventListener(type, listener)
  return () => {
    target.removeEventListener(type, listener)
  }
}

export { listenFor, systemOf }
