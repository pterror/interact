import { describe, expect, test } from 'bun:test'

import { clearRange, moveAfter, removeRange } from './ranges.js'
import { lastNode } from './test-helpers.js'

/**
 * A container holding `a`, then a range around `b`, then `c`.
 * @returns {Readonly<{ container: Element, range: Readonly<{ open: Comment, close: Comment }> }>} Them
 */
function setUp() {
  const container = document.createElement('div')
  const range = { close: document.createComment('i]'), open: document.createComment('i[') }
  container.append('a', range.open, 'b', range.close, 'c')
  return { container, range }
}

describe('ranges', () => {
  test('clears between the markers and keeps them', () => {
    const { container, range } = setUp()
    clearRange(range)
    expect(container.innerHTML).toBe('a<!--i[--><!--i]-->c')
  })

  test('removes the markers too', () => {
    const { container, range } = setUp()
    removeRange(range)
    expect(container.innerHTML).toBe('ac')
  })

  test('moves a range after a node', () => {
    const { container, range } = setUp()
    moveAfter(lastNode(container), range)
    expect(container.innerHTML).toBe('ac<!--i[-->b<!--i]-->')
  })
})
