import { describe, expect, test } from 'bun:test'

import { arrayGroups } from './array-groups.js'
import { cell } from './cell.js'
import { gridStep } from './grid-step.js'
import { groupReorder } from './group-reorder.js'
import { groupedCards } from './grouped-cards.js'

/**
 * Groups a (5 cards), b (none) and c (2), three columns wide, cards 100 by 50, headers 20 high
 * @returns {ReturnType<typeof groupedCards>} The layout
 */
function layout() {
  return groupedCards({ cardHeight: 50, cardWidth: 100, headerHeight: 20, sizes: cell([5, 0, 2]), width: cell(300) })
}

describe('groupedCards', () => {
  test('places each header across the width and its cards in rows under it', () => {
    const at = layout()
    expect(at.place(0)).toEqual({ height: 20, x: 0, y: 0 })
    expect(at.place(5)).toEqual({ height: 50, width: 100, x: 100, y: 70 })
    expect(at.place(6)).toEqual({ height: 20, x: 0, y: 120 })
    expect(at.place(7)).toEqual({ height: 20, x: 0, y: 140 })
    expect(at.place(9)).toEqual({ height: 50, width: 100, x: 100, y: 160 })
    expect(at.extent(10)).toEqual({ height: 210 })
  })

  test('gives the ranks in a span of pixels, by whole headers and rows', () => {
    const at = layout()
    expect(at.ranksIn(0, 10, 10)).toEqual({ from: 0, to: 1 })
    expect(at.ranksIn(30, 80, 10)).toEqual({ from: 1, to: 6 })
    expect(at.ranksIn(125, 210, 10)).toEqual({ from: 6, to: 10 })
  })

  test('steps rows up and down across groups, keeping the column, skipping headers and empty groups', () => {
    const at = layout()
    expect(at.rowStep(undefined, 1)).toBe(1)
    expect(at.rowStep(undefined, -1)).toBe(9)
    expect(at.rowStep(2, 1)).toBe(5)
    expect(at.rowStep(3, 1)).toBe(5)
    expect(at.rowStep(5, 1)).toBe(9)
    expect(at.rowStep(9, -1)).toBe(5)
    expect(at.rowStep(8, -2)).toBe(1)
    expect(at.rowStep(9, 5)).toBe(9)
    expect(at.rowStep(0, 1)).toBe(1)
  })
})

/**
 * The groups as lists of keys
 * @param {ReturnType<typeof arrayGroups<string, string>>} groups - The groups
 * @returns {string[][]} Each group's name, then its keys
 */
function shown(groups) {
  return groups.groups().map(([group, keys]) => [group, ...keys])
}

describe('arrayGroups and groupReorder', () => {
  test('see rows with headers, options, sizes, and keys held through moves between groups', () => {
    const groups = arrayGroups({
      headerOf: (group) => `#${group}`,
      initial: [
        ['a', ['a1', 'a2']],
        ['b', []],
        ['c', ['c1']],
      ],
    })
    expect(groups.rows.keys()).toEqual(['#a', 'a1', 'a2', '#b', '#c', 'c1'])
    expect(groups.options.keys()).toEqual(['a1', 'a2', 'c1'])
    expect(groups.sizes.get()).toEqual([2, 0, 1])
    const active = groups.hold('a1', 'next')
    const reorder = groupReorder(groups)
    reorder('a1', 'c1', true)
    expect(shown(groups)).toEqual([['a', 'a2'], ['b'], ['c', 'c1', 'a1']])
    reorder('a2', '#b', false)
    expect(shown(groups)).toEqual([['a'], ['b', 'a2'], ['c', 'c1', 'a1']])
    expect([groups.groupOf('a2'), active.get()]).toEqual(['b', 'a1'])
    reorder('#c', 'a2', true)
    expect(groups.sizes.get()).toEqual([0, 1, 2])
  })
})

describe('gridStep', () => {
  test('steps through keys by the layout rows, from ranks', async () => {
    const at = layout()
    const rows = ['#a', 'a1', 'a2', 'a3', 'a4', 'a5', '#b', '#c', 'c1', 'c2']
    const step = gridStep({
      keysAt: { keysAt: (from, to) => Promise.resolve(rows.slice(from, to)) },
      locate: (key) => Promise.resolve(rows.indexOf(key)),
      rowStep: at.rowStep,
    })
    expect(await step('a2', 1)).toBe('a5')
    expect(await step('a5', 1)).toBe('c2')
    expect(await step(undefined, -1)).toBe('c2')
  })
})
