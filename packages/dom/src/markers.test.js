import { describe, expect, test } from 'bun:test'

import { CLOSE_MARKUP, OPEN_MARKUP, matchingClose } from './markers.js'
import { firstOpen, outerRange } from './test-helpers.js'

describe('markers', () => {
  test('finds the close that matches an open, past nested pairs', () => {
    const container = document.createElement('div')
    container.innerHTML = `${OPEN_MARKUP}${OPEN_MARKUP}x${CLOSE_MARKUP}y${CLOSE_MARKUP}`
    const range = outerRange(container)
    expect(matchingClose(range.open)).toBe(range.close)
  })

  test('fails on an open that never closes', () => {
    const container = document.createElement('div')
    container.innerHTML = `${OPEN_MARKUP}x`
    const open = firstOpen(container)
    expect(() => matchingClose(open)).toThrow('never closed')
  })
})
