/** @import { Entry } from './template.js' */

import { describe, expect, test } from 'bun:test'

import { reconcile } from './reconcile.js'
import { html, repeat } from './template.js'
import { childParts, emptyHole, watchChildren } from './test-helpers.js'

/**
 * One entry per key, each an `<i>` showing it.
 * @param {readonly string[]} keys - The keys
 * @returns {readonly Entry[]} The entries
 */
function rows(keys) {
  return repeat(
    keys,
    (key) => key,
    (key) => html`<i>${key}</i>`,
  ).entries
}

describe('reconcile', () => {
  test('keeps items without moving them when one goes from the front and one comes at the end', () => {
    const { container, range } = emptyHole()
    const first = reconcile([], rows(['a', 'b', 'c']), { childParts, range })
    const [, second, third] = first
    const touched = watchChildren(container)
    const next = reconcile(first, rows(['b', 'c', 'd']), { childParts, range })
    /** @type {Set<Node | undefined>} */
    const stayed = new Set([second?.range.open, third?.range.open])
    expect(next.map(({ key }) => key)).toEqual(['b', 'c', 'd'])
    expect(touched().filter((node) => stayed.has(node))).toEqual([])
    expect(container.textContent).toBe('bcd')
  })
})
