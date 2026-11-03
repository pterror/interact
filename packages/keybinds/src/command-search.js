/**
 * Searching a hub's commands for a command system: by keybinds' own matcher and scorer, and, if the app gives one,
 * with further commands from a source asked once typing pauses. A command found only in the source's answer runs from
 * that answer.
 * @import { Command, Context } from './command.js'
 * @import { CommandSystemOptions, FoundSystemCommand, SystemCommand } from './command-system.js'
 * @import { ScoredCommand } from './search.js'
 */

import { isActive } from './command.js'
import { fuzzyMatcher } from './matchers.js'
import { searchCommands } from './search.js'

/**
 * Further commands for a query, from somewhere other than the hub, at once or later
 * @typedef {(query: string) => readonly Command[] | Promise<readonly Command[]>} CommandSource
 */

/**
 * What a search needs: the hub's commands and context, which commands a menu's tag picks, listing them as with no
 * query, a command as listed, and how to search
 * @typedef {Readonly<{
 *   commands: () => readonly Command[],
 *   context: () => Context,
 *   inMenu: (command: Command, tag: string | undefined) => boolean,
 *   list: (tag: string | undefined) => readonly SystemCommand[],
 *   listed: (found: Readonly<{ command: Command, enabled: boolean }>) => SystemCommand,
 *   options: CommandSystemOptions,
 * }>} SearchParts
 */

const SOURCE_DELAY = 200
const NOT_ASKED = 0

/**
 * What a source answers, or nothing if it fails: a source that fails adds no commands
 * @param {CommandSource} source - Where to ask
 * @param {string} query - What was typed
 * @returns {Promise<readonly Command[]>} The answer
 */
async function attempt(source, query) {
  try {
    const answer = await source(query)
    return answer
  } catch {
    return []
  }
}

/**
 * Waits a while
 * @param {number} milliseconds - How long
 * @returns {Promise<void>} When it has passed
 */
async function pause(milliseconds) {
  /** @type {PromiseWithResolvers<void>} */
  const passed = Promise.withResolvers()
  setTimeout(() => {
    passed.resolve()
  }, milliseconds)
  await passed.promise
}

/** A hub's commands searched, with what a source last answered */
class CommandSearch {
  /**
   * @readonly
   * @type {SearchParts}
   */
  #parts
  /** How many searches have asked the source, so one that typing has passed by doesn't ask it */
  #asked = NOT_ASKED
  /**
   * The commands the source last answered that the hub doesn't have, by id
   * @type {ReadonlyMap<string, Command>}
   */
  #answered = new Map()

  /** @param {SearchParts} parts - What it searches, and how */
  constructor(parts) {
    this.#parts = parts
  }

  /**
   * The commands found for what was typed, in a menu or among all: every one listed for nothing typed; otherwise the
   * hub's matches, best first, and with a source, its matches too, once typing pauses.
   * @param {string} query - What was typed
   * @param {string | undefined} tag - The menu's tag, if any
   * @returns {readonly FoundSystemCommand[] | Promise<readonly FoundSystemCommand[]>} What was found
   */
  search(query, tag) {
    if (query.trim() === '') {
      return this.#parts.list(tag)
    }
    const { source } = this.#parts.options
    if (source === undefined) {
      return this.#found(this.#parts.commands(), query, tag)
    }
    return this.#withSource(source, query, tag)
  }

  /**
   * Runs a command found only in the source's last answer, if it applies now
   * @param {string} id - The command
   * @returns {boolean} Whether it ran
   */
  runFound(id) {
    const command = this.#answered.get(id)
    const context = this.#parts.context()
    if (command === undefined || !isActive(command, context)) {
      return false
    }
    command.execute(context)
    return true
  }

  /**
   * The hub's matches and the source's, asked once typing has paused; a search typing passed by in the meantime finds
   * the hub's alone, as its answer is dropped
   * @param {CommandSource} source - Where to ask
   * @param {string} query - What was typed
   * @param {string | undefined} tag - The menu's tag, if any
   * @returns {Promise<readonly FoundSystemCommand[]>} What was found
   */
  async #withSource(source, query, tag) {
    this.#asked += 1
    const asked = this.#asked
    await pause(this.#parts.options.sourceDelay ?? SOURCE_DELAY)
    const own = this.#parts.commands()
    if (asked !== this.#asked) {
      return this.#found(own, query, tag)
    }
    const extra = await this.#ask(source, query, own)
    return this.#found([...own, ...extra], query, tag)
  }

  /**
   * Asks the source, keeping the commands it answers that the hub doesn't have, to run them if chosen
   * @param {CommandSource} source - Where to ask
   * @param {string} query - What was typed
   * @param {readonly Command[]} own - The hub's commands
   * @returns {Promise<readonly Command[]>} The source's commands the hub doesn't have
   */
  async #ask(source, query, own) {
    const answer = await attempt(source, query)
    const ids = new Set(own.map(({ id }) => id))
    const extra = answer.filter(({ id }) => !ids.has(id))
    this.#answered = new Map(extra.map((command) => [command.id, command]))
    return extra
  }

  /**
   * The commands among some that match what was typed, best first, each with where its label matched
   * @param {readonly Command[]} commands - The commands
   * @param {string} query - What was typed
   * @param {string | undefined} tag - The menu's tag, if any
   * @returns {FoundSystemCommand[]} What was found
   */
  #found(commands, query, tag) {
    const { context, inMenu, options } = this.#parts
    const shown = commands.filter((command) => inMenu(command, tag))
    const found = searchCommands(shown, query, { context: context(), matcher: options.matcher, scorer: options.scorer })
    return found.map((result) => this.#withPositions(result, query))
  }

  /**
   * A result as listed, with where the query matched its label: a match on its id or description marks none
   * @param {ScoredCommand} result - The result
   * @param {string} query - What was typed
   * @returns {FoundSystemCommand} The command found
   */
  #withPositions(result, query) {
    const shown = this.#parts.listed({ command: result.command, enabled: result.active })
    const positions = (this.#parts.options.matcher ?? fuzzyMatcher)(query, result.command.label)?.positions
    return positions === undefined ? shown : { ...shown, positions }
  }
}

export { CommandSearch }
