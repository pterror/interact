import { describe, expect, test } from 'bun:test'

import { fuzzyMatcher, simpleMatcher } from './matchers.js'

const STARTS = 2
const CONTAINS = 1
const AT_H = 0
const AT_L = 2
const AT_O = 4
const D_AFTER_SPACE = 5
const NONE = 0

/**
 * A fuzzy match's score, none for no match
 * @param {string} query - What was typed
 * @param {string} text - What to match it in
 * @returns {number} The score
 */
function fuzzyScore(query, text) {
  return fuzzyMatcher(query, text)?.score ?? NONE
}

describe('fuzzyMatcher', () => {
  test('finds nothing when a letter is missing', () => {
    expect(fuzzyMatcher('xyz', 'hello')).toBeUndefined()
  })

  test('gives where each letter matched, in order', () => {
    expect(fuzzyMatcher('hlo', 'hello')?.positions).toEqual([AT_H, AT_L, AT_O])
    expect(fuzzyMatcher('d', 'save document')?.positions).toEqual([D_AFTER_SPACE])
  })

  test('scores letters in a row, the same case, and covering more of the text higher', () => {
    expect(fuzzyScore('he', 'hello')).toBeGreaterThan(fuzzyScore('ho', 'hello'))
    expect(fuzzyScore('S', 'Save')).toBeGreaterThan(fuzzyScore('s', 'Save'))
    expect(fuzzyScore('ab', 'ab')).toBeGreaterThan(fuzzyScore('ab', 'a_________b'))
  })
})

describe('simpleMatcher', () => {
  test('scores starting the text over being inside it, ignoring case', () => {
    expect(simpleMatcher('hel', 'Hello')).toEqual({ score: STARTS })
    expect(simpleMatcher('HEL', 'hello')).toEqual({ score: STARTS })
    expect(simpleMatcher('llo', 'Hello')).toEqual({ score: CONTAINS })
  })

  test('finds nothing when the text does not contain the query', () => {
    expect(simpleMatcher('xyz', 'Hello')).toBeUndefined()
  })
})
