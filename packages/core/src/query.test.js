/** @import { Answer, Query, Question } from './query.js' */
/** @import { ItemSource } from './source.js' */

import { describe, expect, test } from 'bun:test'

import { MemorySource } from './memory-source.js'
import { defineQuery } from './query.js'

/** @type {Query<string, number | undefined>} */
const firstStarting = defineQuery()
/** @type {Query<undefined, number>} */
const other = defineQuery()

const names = new MemorySource(['ada', 'bea', 'cy'], (name) => name)

/**
 * The names, as a source that answers `firstStarting` from them.
 * @type {ItemSource<string>}
 */
const answering = {
  /**
   * @param {Question} question - The question
   * @returns {Answer | undefined} The answer, if it is a `firstStarting` question
   */
  ask: (question) => {
    const asked = firstStarting.input(question)
    if (asked === undefined) {
      return undefined
    }
    const found = ['ada', 'bea', 'cy'].findIndex((name) => name.startsWith(asked.input))
    return firstStarting.answer(found === -1 ? undefined : found)
  },
  count: () => names.count(),
  key: (name) => name,
  read: (start, end) => names.read(start, end),
  subscribe: (listener) => names.subscribe(listener),
}

describe('queries', () => {
  test('are answered by a source that knows them', () => {
    expect(firstStarting.ask(answering, 'b')).toEqual({ answer: 1 })
    expect(firstStarting.ask(answering, 'z')).toEqual({ answer: undefined })
  })

  test('go unanswered by a source that knows other queries, or none', () => {
    expect(other.ask(answering, undefined)).toBeUndefined()
    expect(firstStarting.ask(names, 'b')).toBeUndefined()
  })
})
