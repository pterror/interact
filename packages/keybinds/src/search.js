/**
 * Searching, ranking and grouping commands, for the command system and the cheatsheet. Results wrap each command with
 * whether it applies now (and, from a search, how well it matched), leaving the command itself as given.
 */

/** @import { BindingField, Command, Context } from './command.js' */

import { bindingsOf, isActive } from './command.js'
import { fuzzyMatcher, simpleMatcher } from './matchers.js'

/**
 * How well a query matches some text, and where
 * @typedef {Readonly<{ positions?: readonly number[], score: number }>} MatchResult
 */

/**
 * Matches a query against some text: a result, or undefined for no match
 * @typedef {(query: string, text: string) => MatchResult | undefined} Matcher
 */

/**
 * When a command was last run, for ranking by frecency
 * @typedef {Readonly<{ id: string, timestamp: number }>} HistoryEntry
 */

/**
 * Ranks a command before relevance: higher first
 * @typedef {(command: Command, context: Context) => number} Scorer
 */

/**
 * How to search: the app's state (for which commands apply), how labels and ids match (fuzzily, unless given), and a
 * ranking added to how well each matched
 * @typedef {Readonly<{ context?: Context | undefined, matcher?: Matcher | undefined, scorer?: Scorer | undefined }>}
 *   SearchOptions
 */

/**
 * A command and whether it applies now
 * @typedef {Readonly<{ active: boolean, command: Command }>} ActiveCommand
 */

/**
 * A command found by a search: whether it applies now, its score, and where the query matched its label
 * @typedef {Readonly<{ active: boolean, command: Command, positions?: readonly number[], score: number }>}
 *   ScoredCommand
 */

const UNRANKED = 0
const OTHER = 'Other'

/** @type {readonly BindingField[]} */
const BINDING_FIELDS = ['keys', 'mouse', 'gamepad']

/**
 * Each command once, the last of any that share an id: the latest registered, or an inner scope's over an outer one
 * @param {readonly Command[]} commands - The commands
 * @returns {Command[]} Them, deduplicated
 */
function dedupeCommands(commands) {
  return [...new Map(commands.map((command) => [command.id, command])).values()]
}

/**
 * Active first, then by rank, then by score
 * @param {ScoredCommand} first - One command
 * @param {ScoredCommand} second - Another
 * @returns {number} Below zero if the first comes first
 */
function byRelevance(first, second) {
  if (first.active !== second.active) {
    return first.active ? -1 : 1
  }
  const rank = (second.command.rank ?? UNRANKED) - (first.command.rank ?? UNRANKED)
  return rank === 0 ? second.score - first.score : rank
}

/**
 * How a query matches a command: its label or id by the matcher; its description or category by the words as typed,
 * since letters scattered through a sentence match almost anything
 * @param {Command} command - The command
 * @param {string} query - The query
 * @param {Matcher} matcher - How labels and ids match
 * @returns {MatchResult | undefined} The match, if any
 */
function matchOf(command, query, matcher) {
  return (
    matcher(query, command.label) ??
    matcher(query, command.id) ??
    (command.description === undefined ? undefined : simpleMatcher(query, command.description)) ??
    (command.category === undefined ? undefined : simpleMatcher(query, command.category))
  )
}

/**
 * A command found, scored
 * @param {Command} command - The command
 * @param {MatchResult} match - How it matched
 * @param {Readonly<{ active: boolean, ranked: number }>} found - Whether it applies, and what a scorer adds
 * @returns {ScoredCommand} The result
 */
function scored(command, match, { active, ranked }) {
  const score = match.score + ranked
  return match.positions === undefined
    ? { active, command, score }
    : { active, command, positions: match.positions, score }
}

/**
 * Searches commands, each id once (the last registered): fuzzy matching unless told otherwise, with a scorer's
 * ranking added on
 * @param {readonly Command[]} commands - The commands
 * @param {string} query - What was typed
 * @param {SearchOptions} [options] - The app's state, a matcher, and a scorer
 * @returns {ScoredCommand[]} Matches, most relevant first: active ones, then by rank, then by score
 */
function searchCommands(commands, query, options = {}) {
  const { context = {}, matcher = fuzzyMatcher, scorer } = options
  /** @type {ScoredCommand[]} */
  const results = []
  for (const command of dedupeCommands(commands)) {
    const match = command.hidden === true ? undefined : matchOf(command, query, matcher)
    if (match !== undefined) {
      const ranked = scorer?.(command, context) ?? 0
      results.push(scored(command, match, { active: isActive(command, context), ranked }))
    }
  }
  return results.toSorted(byRelevance)
}

/**
 * Commands grouped by category, each id once (the last registered), leaving out hidden ones and ones with no bindings
 * @param {readonly Command[]} commands - The commands
 * @param {Context} [context] - The app's state, for which apply
 * @param {readonly BindingField[]} [fields] - The command fields that hold bindings
 * @returns {Record<string, ActiveCommand[]>} The commands, by category ("Other" for none)
 */
function groupByCategory(commands, context = {}, fields = BINDING_FIELDS) {
  /** @type {Record<string, ActiveCommand[]>} */
  const groups = {}
  for (const command of dedupeCommands(commands)) {
    const bound = fields.some((field) => bindingsOf(command, field).length > 0)
    if (command.hidden !== true && bound) {
      const category = command.category === undefined || command.category === '' ? OTHER : command.category
      groups[category] = [...(groups[category] ?? []), { active: isActive(command, context), command }]
    }
  }
  return groups
}

/**
 * Whether a command is in a menu: with no tag, every command is; with one, those whose `menu` is or includes it
 * @param {Command} command - The command
 * @param {string | undefined} menu - The menu's tag, if any
 * @returns {boolean} Whether its menu tags include it
 */
function inMenu(command, menu) {
  if (menu === undefined) {
    return true
  }
  return typeof command.menu === 'string' ? command.menu === menu : (command.menu ?? []).includes(menu)
}

export { groupByCategory, inMenu, searchCommands }
