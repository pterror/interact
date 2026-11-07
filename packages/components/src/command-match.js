/**
 * Finding commands by what was typed, for a command system that can't search its own: its listed commands whose
 * label contains the query, ignoring case and accents, best first.
 * @import { BridgeCommand } from './command-bridge.js'
 */

/**
 * A command found by a search: the command, and where in its label the query matched, as indices of the label's UTF-16
 * code units, for showing it.
 * @typedef {BridgeCommand & Readonly<{ positions?: readonly number[] }>} FoundCommand
 */

/** How well a label matches: from its start, from the start of a word in it, or somewhere inside a word. */
const AT_START = 0
const AT_WORD = 1
const INSIDE = 2

/** @type {Intl.Collator | undefined} */
let collator = undefined

/**
 * Whether the text at an index is what was typed, ignoring case and accents.
 * @param {string} label - The label
 * @param {string} query - What was typed, normalized
 * @param {number} index - Where to look
 * @returns {boolean} Whether it is
 */
function matchesAt(label, query, index) {
  collator ??= new Intl.Collator(undefined, { sensitivity: 'base', usage: 'search' })
  return collator.compare(label.slice(index, index + query.length), query) === 0
}

/**
 * Where a query first matches in a label, preferring the start of a word: the index, and how good a match it is.
 * @param {string} label - The label
 * @param {string} query - What was typed, normalized
 * @returns {Readonly<{ index: number, rank: number }> | undefined} The match, if there is one
 */
function bestMatch(label, query) {
  /** @type {number} */
  let inside = -1
  for (let index = 0; index + query.length <= label.length; index += 1) {
    if (matchesAt(label, query, index)) {
      if (index === 0) {
        return { index, rank: AT_START }
      }
      if (/[\s\p{P}]/u.test(label.charAt(index - 1))) {
        return { index, rank: AT_WORD }
      }
      inside = inside === -1 ? index : inside
    }
  }
  return inside === -1 ? undefined : { index: inside, rank: INSIDE }
}

/**
 * The commands whose labels contain the query, ignoring case and accents: those whose label starts with it first, then
 * those with a word starting with it, then the rest, each in the order listed, with where it matched. An empty query
 * finds every command, in order.
 * @param {readonly BridgeCommand[]} commands - The commands listed
 * @param {string} query - What was typed
 * @returns {FoundCommand[]} What was found, best first
 */
function matchCommands(commands, query) {
  const wanted = query.trim().normalize('NFC')
  if (wanted === '') {
    return [...commands]
  }
  /** @type {Readonly<{ found: FoundCommand, rank: number, order: number }>[]} */
  const ranked = []
  for (const [order, command] of commands.entries()) {
    const match = bestMatch(command.label, wanted)
    if (match !== undefined) {
      const positions = Array.from({ length: wanted.length }, (_unused, offset) => match.index + offset)
      ranked.push({ found: { ...command, positions }, order, rank: match.rank })
    }
  }
  return ranked.toSorted((one, other) => one.rank - other.rank || one.order - other.order).map(({ found }) => found)
}

export { matchCommands }
