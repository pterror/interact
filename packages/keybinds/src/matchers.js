/**
 * Matching a query against text, for searching commands: by substring, or by letters in order, with where they matched
 * for highlighting.
 */

/** @import { MatchResult } from './search.js' */

const STARTS = 2
const CONTAINS = 1
const CONSECUTIVE = 2
const WORD_START = 3
const SAME_CASE = 1
const COVERAGE = 10
const WHOLE_AT_WORD_START = 20
const WHOLE = 10
const NONE = 0
const NOT_FOUND = -1
const BEFORE_START = -1
const NEXT = 1
const SEPARATORS = ' -_'

/**
 * Matches a query as a substring, ignoring case: starting the text scores more than inside it
 * @param {string} query - What was typed
 * @param {string} text - What to match it in
 * @returns {MatchResult | undefined} The match, or undefined if the text doesn't contain it
 */
function simpleMatcher(query, text) {
  const lowerQuery = query.toLowerCase()
  const lowerText = text.toLowerCase()
  if (lowerText.startsWith(lowerQuery)) {
    return { score: STARTS }
  }
  return lowerText.includes(lowerQuery) ? { score: CONTAINS } : undefined
}

/**
 * Whether a position in some text starts a word: the very start, or after a space, hyphen or underscore
 * @param {string} text - The text
 * @param {number} at - The position
 * @returns {boolean} Whether a word starts there
 */
function atWordStart(text, at) {
  return at === NONE || SEPARATORS.includes(text.charAt(at - NEXT))
}

/**
 * Where each of a query's letters is found in some text, in order, each the first after the one before
 * @param {string} query - The query, lowercase
 * @param {string} text - The text, lowercase
 * @returns {number[] | undefined} Each letter's position, or undefined if some letter isn't there
 */
function letterPositions(query, text) {
  /** @type {number[]} */
  const positions = []
  let from = NONE
  for (let order = NONE; order < query.length; order += NEXT) {
    const at = text.indexOf(query.charAt(order), from)
    if (at === NOT_FOUND) {
      return undefined
    }
    positions.push(at)
    from = at + NEXT
  }
  return positions
}

/**
 * A fuzzy match being scored: the query and text as written, the text lowercase, and where each letter matched
 * @typedef {Readonly<{ lowerText: string, positions: readonly number[], query: string, text: string }>} Letters
 */

/**
 * What one matched letter adds: right after the one before, at a word's start, in the same case as typed
 * @param {Letters} letters - The match
 * @param {number} order - Which letter of the query
 * @returns {number} Its score
 */
function letterScore(letters, order) {
  const at = letters.positions[order] ?? NOT_FOUND
  const previous = letters.positions[order - NEXT] ?? BEFORE_START
  return (
    (at === previous + NEXT ? CONSECUTIVE : NONE) +
    (atWordStart(letters.lowerText, at) ? WORD_START : NONE) +
    (letters.query.charAt(order) === letters.text.charAt(at) ? SAME_CASE : NONE)
  )
}

/**
 * What the query typed whole adds: more than its letters scattered, and most at a word's start
 * @param {string} lowerQuery - The query, lowercase
 * @param {string} lowerText - The text, lowercase
 * @returns {number} Its score
 */
function wholeScore(lowerQuery, lowerText) {
  const at = lowerText.indexOf(lowerQuery)
  if (at === NOT_FOUND) {
    return NONE
  }
  return atWordStart(lowerText, at) ? WHOLE_AT_WORD_START : WHOLE
}

/**
 * Matches a query's letters in order anywhere in the text, ignoring case. Scores letters in a row, at a word's start
 * and in the same case, how much of the text they cover, and the query found whole; gives where each letter matched
 * @param {string} query - What was typed
 * @param {string} text - What to match it in
 * @returns {MatchResult | undefined} The match, or undefined if some letter isn't there
 */
function fuzzyMatcher(query, text) {
  const lowerQuery = query.toLowerCase()
  const lowerText = text.toLowerCase()
  const positions = letterPositions(lowerQuery, lowerText)
  if (positions === undefined) {
    return undefined
  }
  const letters = { lowerText, positions, query, text }
  let score = Math.round((positions.length / lowerText.length) * COVERAGE) + wholeScore(lowerQuery, lowerText)
  for (const order of positions.keys()) {
    score += letterScore(letters, order)
  }
  return { positions, score }
}

export { fuzzyMatcher, simpleMatcher }
