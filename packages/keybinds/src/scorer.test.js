import { describe, expect, test } from 'bun:test'

import { defaultScorer } from './scorer.js'

const ALWAYS = 1
const WHEN_HOLDS = 2
const EXCLUDED = 0
const LAST_MINUTE = 3
const LAST_FIVE = 2
const LAST_HALF_HOUR = 1
const TEN_SECONDS = 10_000
const THIRTY_SECONDS = 30_000
const TWO_MINUTES = 120_000
const TEN_MINUTES = 600_000
const OVER_AN_HOUR = 4_000_000
const A_SECOND = 1000

const holds = { execute: () => undefined, id: 'a', label: 'A', when: () => true }
const fails = { execute: () => undefined, id: 'b', label: 'B', when: () => false }
const always = { execute: () => undefined, id: 'c', label: 'C' }

/**
 * The default scorer's score for the command with no `when`, run these many milliseconds ago
 * @param {readonly number[]} agesAgo - When it ran, each as how long ago
 * @param {string} [id] - Which command's runs these are
 * @returns {number} The score
 */
function scoreAfterRuns(agesAgo, id = 'c') {
  const now = Date.now()
  return defaultScorer(agesAgo.map((age) => ({ id, timestamp: now - age })))(always, {})
}

describe('defaultScorer', () => {
  test('scores a command whose when holds over one with none, and one whose when fails nothing', () => {
    const scorer = defaultScorer()
    expect([scorer(always, {}), scorer(holds, {}), scorer(fails, {})]).toEqual([ALWAYS, WHEN_HOLDS, EXCLUDED])
  })

  test('adds more the more recently a command ran', () => {
    expect(scoreAfterRuns([TEN_SECONDS])).toBe(ALWAYS + LAST_MINUTE)
    expect(scoreAfterRuns([TWO_MINUTES])).toBe(ALWAYS + LAST_FIVE)
    expect(scoreAfterRuns([TEN_MINUTES])).toBe(ALWAYS + LAST_HALF_HOUR)
    expect(scoreAfterRuns([OVER_AN_HOUR])).toBe(ALWAYS)
  })

  test('counts the most recent run, and only the command’s own', () => {
    expect(scoreAfterRuns([TEN_MINUTES, THIRTY_SECONDS])).toBe(ALWAYS + LAST_MINUTE)
    expect(scoreAfterRuns([A_SECOND], 'different')).toBe(ALWAYS)
  })
})
