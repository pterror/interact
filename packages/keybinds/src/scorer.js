/**
 * The default ranking for menus: commands that apply only in some context first, then the ones run recently.
 */

/** @import { HistoryEntry, Scorer } from './search.js' */

const WHEN_HOLDS = 2
const ALWAYS = 1
const EXCLUDED = 0
const NONE = 0
const MINUTE = 60_000
const FIVE_MINUTES = 300_000
const HALF_AN_HOUR = 1_800_000

/**
 * How much running a command recently adds, by how long ago: the first window it falls in counts
 * @type {readonly Readonly<{ boost: number, within: number }>[]}
 */
const RECENCY = [
  { boost: 3, within: MINUTE },
  { boost: 2, within: FIVE_MINUTES },
  { boost: 1, within: HALF_AN_HOUR },
]

/**
 * What running a command recently adds: the most any of its runs earns
 * @param {string} id - The command
 * @param {readonly HistoryEntry[]} history - When commands were run
 * @param {number} now - The time now
 * @returns {number} The boost
 */
function recency(id, history, now) {
  let best = NONE
  for (const entry of history) {
    const age = now - entry.timestamp
    const earned = entry.id === id ? (RECENCY.find(({ within }) => age <= within)?.boost ?? NONE) : NONE
    best = Math.max(best, earned)
  }
  return best
}

/**
 * The default scorer: specificity, then frecency. A command whose `when` holds scores 2, one with no `when` 1, and
 * one whose `when` fails 0 with no boost. Commands run in the last minute add 3, five minutes 2, half an hour 1
 * @param {readonly HistoryEntry[]} [history] - When commands were run
 * @returns {Scorer} The scorer
 */
function defaultScorer(history = []) {
  return (command, context) => {
    if (command.when === undefined) {
      return ALWAYS + recency(command.id, history, Date.now())
    }
    return command.when(context) ? WHEN_HOLDS + recency(command.id, history, Date.now()) : EXCLUDED
  }
}

export { defaultScorer }
