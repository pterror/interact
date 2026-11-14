import { describe, expect, test } from 'bun:test'

import { leadingGaps } from './leading-gaps.js'

/**
 * Three items 100 wide with 10 between, across a row, at 0, 110 and 220
 * @returns {ReturnType<typeof leadingGaps<string>>} Their gaps
 */
function row() {
  const element = document.createElement('div')
  /** @type {Map<Element, string>} */
  const keys = new Map()
  for (const [index, key] of ['a', 'b', 'c'].entries()) {
    const item = document.createElement('div')
    item.getBoundingClientRect = () => new globalThis.window.DOMRect(index * 110, 0, 100, 30)
    keys.set(item, key)
    element.append(item)
  }
  return leadingGaps({
    axis: 'x',
    element,
    itemOf: (target) => {
      const key = target instanceof Element ? keys.get(target) : undefined
      return key === undefined || !(target instanceof Element) ? undefined : { element: target, key }
    },
  })
}

describe('leadingGaps', () => {
  test("takes the next slot once the dragged item's leading edge enters the next item", () => {
    const gap = row()
    const drag = { from: { x: 50, y: 10 }, key: 'a' }
    expect(gap({ x: 55, y: 10 }, drag)).toEqual({ after: false, target: 'a' })
    expect(gap({ x: 70, y: 10 }, drag)).toEqual({ after: true, target: 'b' })
    expect(gap({ x: 175, y: 10 }, drag)).toEqual({ after: true, target: 'c' })
    const back = { from: { x: 250, y: 10 }, key: 'c' }
    expect(gap({ x: 240, y: 10 }, back)).toEqual({ after: false, target: 'c' })
    expect(gap({ x: 230, y: 10 }, back)).toEqual({ after: false, target: 'b' })
  })

  test('turns only once the pointer comes back further than a few pixels', () => {
    const gap = row()
    const drag = { from: { x: 50, y: 10 }, key: 'a' }
    expect(gap({ x: 70, y: 10 }, drag)).toEqual({ after: true, target: 'b' })
    expect(gap({ x: 65, y: 10 }, drag)).toEqual({ after: true, target: 'b' })
    expect(gap({ x: 62, y: 10 }, drag)).toEqual({ after: false, target: 'a' })
    expect(gap({ x: 70, y: 10 }, { from: { x: 50, y: 10 }, key: 'a' })).toEqual({ after: true, target: 'b' })
  })

  test('answers none for an item not drawn', () => {
    expect(row()({ x: 0, y: 0 }, { from: { x: 0, y: 0 }, key: 'z' })).toBeUndefined()
  })
})
