/**
 * A CommandHub as a command system (`hub.commandSystem()`), for a bridge that keeps menus, a palette and buttons in
 * step with it, such as `@interact/components`' CommandBridge: it has the shape such a bridge asks for, and imports
 * nothing of it. It lists, searches and ranks its own commands, so how they rank stays keybinds'.
 * @import { Command, Context } from './command.js'
 * @import { CommandSource } from './command-search.js'
 * @import { Matcher, Scorer } from './search.js'
 */

import { CommandSearch } from './command-search.js'
import { isActive } from './command.js'
import { inMenu } from './search.js'

/**
 * A command as the system lists it: its id and name, whether it applies now, and, if it has them, its first binding as
 * people read it, its group and what it does.
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
 * A command a search found: as listed, with where in its label the query matched, as indices of its UTF-16 code units.
 * @typedef {SystemCommand & Readonly<{ positions?: readonly number[] }>} FoundSystemCommand
 */

/**
 * A hub as a command system: the commands available in a context (a menu's tag, or undefined for every command),
 * searching them by what was typed, running one, and hearing when which apply may have changed.
 * @typedef {Readonly<{
 *   list: (tag: string | undefined) => readonly SystemCommand[],
 *   search: (query: string, tag: string | undefined) => readonly FoundSystemCommand[] |
 *     Promise<readonly FoundSystemCommand[]>,
 *   run: (id: string) => boolean,
 *   subscribe: (listener: () => void) => () => void,
 * }>} CommandSystem
 */

/**
 * How the system searches and ranks: how labels and ids match (fuzzily, unless given); a scorer ranking a menu's
 * commands, and added to how well each search result matched (`defaultScorer(history)` ranks by specificity and by
 * what was run recently); and further commands for a query, from somewhere other than the hub (a server), asked once
 * typing pauses for `sourceDelay` milliseconds (default 200).
 * @typedef {Readonly<{ matcher?: Matcher, scorer?: Scorer, source?: CommandSource, sourceDelay?: number }>}
 *   CommandSystemOptions
 */

/**
 * What a hub gives its command system: its commands as they listen, its context, each command's first binding as
 * people read it, a way to hear its context synced, and running one.
 * @typedef {Readonly<{
 *   commands: () => readonly Command[],
 *   context: () => Context,
 *   shortcut: (id: string) => string | undefined,
 *   listen: (listener: () => void) => () => void,
 *   run: (id: string) => boolean,
 * }>} HubOperations
 */

const BEFORE = -1
const AFTER = 1
const NOTHING = 0

/**
 * A command as the system lists it.
 * @param {HubOperations} hub - What the hub gives
 * @param {Readonly<{ command: Command, enabled: boolean }>} found - The command, and whether it applies now
 * @returns {SystemCommand} The command, listed
 */
function listed(hub, { command, enabled }) {
  const shortcut = hub.shortcut(command.id)
  return {
    enabled,
    id: command.id,
    label: command.label,
    ...(shortcut === undefined ? {} : { shortcut }),
    ...(command.category === undefined ? {} : { category: command.category }),
    ...(command.description === undefined ? {} : { description: command.description }),
  }
}

/**
 * A command with whether it applies, and its score
 * @typedef {Readonly<{ command: Command, enabled: boolean, score: number }>} Scored
 */

/**
 * The order of two scored commands: those that apply first, then by score
 * @param {Scored} first - One command
 * @param {Scored} second - Another
 * @returns {number} Below zero if the first comes first
 */
function byRank(first, second) {
  if (first.enabled !== second.enabled) {
    return first.enabled ? BEFORE : AFTER
  }
  return second.score - first.score
}

/**
 * Commands ranked by a scorer: those that apply first, then by score, keeping their order otherwise. A command the
 * scorer gives nothing is left out if it has a condition; one without always stays.
 * @param {readonly Readonly<{ command: Command, enabled: boolean }>[]} commands - The commands, and whether each applies
 * @param {Readonly<{ context: Context, scorer: Scorer }>} by - The app's state, and the scorer
 * @returns {Readonly<{ command: Command, enabled: boolean }>[]} Them, ranked
 */
function ranked(commands, { context, scorer }) {
  /** @type {Scored[]} */
  const scored = commands.map(({ command, enabled }) => ({ command, enabled, score: scorer(command, context) }))
  return scored.filter(({ command, score }) => command.when === undefined || score > NOTHING).toSorted(byRank)
}

/**
 * The commands a menu lists, or every one with no tag, leaving out hidden ones: in the order registered, or ranked by
 * a scorer if the system has one.
 * @param {HubOperations} hub - What the hub gives
 * @param {string | undefined} tag - The menu's tag, if any
 * @param {Scorer | undefined} scorer - How to rank them, if at all
 * @returns {SystemCommand[]} The commands
 */
function listIn(hub, tag, scorer) {
  const context = hub.context()
  const shown = hub
    .commands()
    .filter((command) => command.hidden !== true && inMenu(command, tag))
    .map((command) => ({ command, enabled: isActive(command, context) }))
  const order = scorer === undefined ? shown : ranked(shown, { context, scorer })
  return order.map((found) => listed(hub, found))
}

/**
 * A hub as a command system. Hidden commands are never listed or found; each command is enabled while it applies; it
 * says its list may have changed whenever the hub's context is synced, which refreshing does too, so a bridge
 * following it is live.
 * @param {HubOperations} hub - What the hub gives
 * @param {CommandSystemOptions} [options] - How it searches and ranks
 * @returns {CommandSystem} The command system
 */
function systemOf(hub, options = {}) {
  /**
   * @param {string | undefined} tag - A menu's tag, or none for every command
   * @returns {SystemCommand[]} The commands listed there
   */
  function list(tag) {
    return listIn(hub, tag, options.scorer)
  }
  const searching = new CommandSearch({
    commands: hub.commands,
    context: hub.context,
    inMenu,
    list,
    listed: (found) => listed(hub, found),
    options,
  })
  /**
   * @param {string} query - What was typed
   * @param {string | undefined} tag - A menu's tag, or none for every command
   * @returns {readonly FoundSystemCommand[] | Promise<readonly FoundSystemCommand[]>} What was found
   */
  function search(query, tag) {
    return searching.search(query, tag)
  }
  return {
    list,
    run: (id) => hub.run(id) || searching.runFound(id),
    search,
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
