/**
 * A CommandHub as a command system (`hub.commandSystem()`), for a bridge that keeps menus, a palette and buttons in
 * step with it, such as `@interact/components`' CommandBridge: it has the shape such a bridge asks for, and imports
 * nothing of it. It lists, searches and ranks its own commands, so how they rank stays keybinds', by its own matcher
 * and scorer, and, if the app gives one, with further commands from a source asked once typing pauses. A command found
 * only in the source's answer runs from that answer.
 * @import { Command, Context } from './command.js'
 * @import { Matcher, Scorer } from './search.js'
 */

import { isActive } from './command.js'
import { fuzzyMatcher } from './matchers.js'
import { inMenu, searchCommands } from './search.js'

/**
 * Further commands for a query, from somewhere other than the hub, at once or later
 * @typedef {(query: string) => readonly Command[] | Promise<readonly Command[]>} CommandSource
 */

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

const SOURCE_DELAY = 200

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
    return first.enabled ? -1 : 1
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
  return scored.filter(({ command, score }) => command.when === undefined || score > 0).toSorted(byRank)
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
  /** How many searches have asked the source, so one that typing has passed by doesn't ask it */
  let asked = 0
  /**
   * The commands the source last answered that the hub doesn't have, by id
   * @type {ReadonlyMap<string, Command>}
   */
  let answered = new Map()
  /**
   * @param {string | undefined} tag - A menu's tag, or none for every command
   * @returns {SystemCommand[]} The commands listed there
   */
  function list(tag) {
    return listIn(hub, tag, options.scorer)
  }
  /**
   * The commands among some that match what was typed, best first, each with where its label matched: a match on its
   * id or description marks none
   * @param {readonly Command[]} commands - The commands
   * @param {string} query - What was typed
   * @param {string | undefined} tag - The menu's tag, if any
   * @returns {FoundSystemCommand[]} What was found
   */
  function found(commands, query, tag) {
    const shown = commands.filter((command) => inMenu(command, tag))
    const results = searchCommands(shown, query, {
      context: hub.context(),
      matcher: options.matcher,
      scorer: options.scorer,
    })
    return results.map((result) => {
      const entry = listed(hub, { command: result.command, enabled: result.active })
      const positions = (options.matcher ?? fuzzyMatcher)(query, result.command.label)?.positions
      return positions === undefined ? entry : { ...entry, positions }
    })
  }
  /**
   * The hub's matches and the source's, asked once typing has paused; a search typing passed by in the meantime finds
   * the hub's alone, as its answer is dropped. The source's commands the hub doesn't have are kept, to run them if
   * chosen; a source that fails adds none
   * @param {CommandSource} source - Where to ask
   * @param {string} query - What was typed
   * @param {string | undefined} tag - The menu's tag, if any
   * @returns {Promise<readonly FoundSystemCommand[]>} What was found
   */
  async function withSource(source, query, tag) {
    asked += 1
    const mine = asked
    /** @type {PromiseWithResolvers<void>} */
    const passed = Promise.withResolvers()
    setTimeout(() => {
      passed.resolve()
    }, options.sourceDelay ?? SOURCE_DELAY)
    await passed.promise
    const own = hub.commands()
    if (mine !== asked) {
      return found(own, query, tag)
    }
    /** @type {readonly Command[]} */
    let answer
    try {
      answer = await source(query)
    } catch {
      answer = []
    }
    const ids = new Set(own.map(({ id }) => id))
    const extra = answer.filter(({ id }) => !ids.has(id))
    answered = new Map(extra.map((command) => [command.id, command]))
    return found([...own, ...extra], query, tag)
  }
  /**
   * The commands found for what was typed, in a menu or among all: every one listed for nothing typed; otherwise the
   * hub's matches, best first, and with a source, its matches too, once typing pauses.
   * @param {string} query - What was typed
   * @param {string | undefined} tag - A menu's tag, or none for every command
   * @returns {readonly FoundSystemCommand[] | Promise<readonly FoundSystemCommand[]>} What was found
   */
  function search(query, tag) {
    if (query.trim() === '') {
      return list(tag)
    }
    const { source } = options
    return source === undefined ? found(hub.commands(), query, tag) : withSource(source, query, tag)
  }
  /**
   * Runs a command found only in the source's last answer, if it applies now
   * @param {string} id - The command
   * @returns {boolean} Whether it ran
   */
  function runFound(id) {
    const command = answered.get(id)
    const context = hub.context()
    if (command === undefined || !isActive(command, context)) {
      return false
    }
    command.execute(context)
    return true
  }
  return {
    list,
    run: (id) => hub.run(id) || runFound(id),
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
