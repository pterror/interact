/**
 * What a palette lists for a query: every visible command for none, otherwise its commands and what its source
 * answered that match, with only those that apply when it hides the rest.
 */

/**
 * @import { Command, Context } from './command.js'
 * @import { Matcher, ScoredCommand } from './search.js'
 */

import { isActive } from './command.js'
import { searchCommands } from './search.js'

/**
 * What a palette searches, and how
 * @typedef {Readonly<{ answered: readonly Command[], commands: readonly Command[], context: Context, hideInactive:
 *   boolean, matcher: Matcher | undefined }>} PaletteSearch
 */

/**
 * Every visible command, as listed with no query
 * @param {PaletteSearch} search - What's searched
 * @returns {ScoredCommand[]} The commands, each with whether it applies
 */
function everything({ commands, context }) {
  return commands
    .filter((command) => command.hidden !== true)
    .map((command) => ({ active: isActive(command, context), command, score: 0 }))
}

/**
 * The commands, and what the source answered (minus ids the commands already have), that match a query
 * @param {string} query - What was typed
 * @param {PaletteSearch} search - What's searched
 * @returns {ScoredCommand[]} The matches, most relevant first
 */
function matching(query, { answered, commands, context, matcher }) {
  const ids = new Set(commands.map(({ id }) => id))
  const all = [...commands, ...answered.filter(({ id }) => !ids.has(id))]
  return searchCommands(all, query, { context, matcher })
}

/**
 * What a palette lists for a query
 * @param {string} query - What was typed
 * @param {PaletteSearch} search - What's searched, and whether commands that don't apply are left out
 * @returns {ScoredCommand[]} The commands to list
 */
function paletteResults(query, search) {
  const found = query === '' ? everything(search) : matching(query, search)
  return search.hideInactive ? found.filter(({ active }) => active) : found
}

export { paletteResults }
