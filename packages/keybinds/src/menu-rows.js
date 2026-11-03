/**
 * Which commands a context menu shows: those tagged with its menu, or every one not hidden, each with whether it
 * applies now; and, for the scored menu, ranked by a scorer.
 */

/**
 * @import { Command, Context } from './command.js'
 * @import { ActiveCommand, Scorer } from './search.js'
 */

import { isActive } from './command.js'
import { filterByMenu } from './search.js'

const BEFORE = -1
const AFTER = 1
const NOTHING = 0

/**
 * A menu's commands: those its tag picks, or every one not hidden when it has none
 * @param {readonly Command[]} commands - The commands
 * @param {Readonly<{ context: Context, menu: string }>} where - The app's state, and the menu's tag ("" for none)
 * @returns {ActiveCommand[]} The commands, and whether each applies
 */
function menuRows(commands, { context, menu }) {
  if (menu !== '') {
    return filterByMenu(commands, menu, context)
  }
  return commands
    .filter((command) => command.hidden !== true)
    .map((command) => ({ active: isActive(command, context), command }))
}

/**
 * A row with its score
 * @typedef {Readonly<{ row: ActiveCommand, score: number }>} Scored
 */

/**
 * Whether a scored row stays: a command the scorer gives nothing is left out if it has a condition
 * @param {Scored} scored - The row and its score
 * @returns {boolean} Whether it stays
 */
function stays({ row, score }) {
  return row.command.when === undefined || score > NOTHING
}

/**
 * The order of two scored rows: those that apply first, then by score
 * @param {Scored} first - One row
 * @param {Scored} second - Another
 * @returns {number} Below zero if the first comes first
 */
function byRank(first, second) {
  if (first.row.active !== second.row.active) {
    return first.row.active ? BEFORE : AFTER
  }
  return second.score - first.score
}

/**
 * Commands ranked: those that apply first, then by score, keeping their order otherwise. A command the scorer gives
 * nothing is left out if it has a condition; one without always stays
 * @param {readonly ActiveCommand[]} rows - The commands, and whether each applies
 * @param {Readonly<{ context: Context, scorer: Scorer }>} by - The app's state, and the scorer
 * @returns {ActiveCommand[]} Them, ranked
 */
function rankedRows(rows, { context, scorer }) {
  /** @type {Scored[]} */
  const scored = rows.map((row) => ({ row, score: scorer(row.command, context) }))
  return scored
    .filter((candidate) => stays(candidate))
    .toSorted(byRank)
    .map((ranked) => ranked.row)
}

export { menuRows, rankedRows }
