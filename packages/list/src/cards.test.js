import { describe, expect, test } from 'bun:test'

import { cards } from './cards.js'
import { cell } from './cell.js'

describe('cards', () => {
  test('fills as many columns as the width holds, and follows it changing', () => {
    const width = cell(350)
    const layout = cards({ cardHeight: 50, cardWidth: 100, width })
    let heard = 0
    layout.watch(() => {
      heard += 1
    })
    expect(layout.columns.get()).toBe(3)
    expect(layout.place(4)).toEqual({ height: 50, width: 100, x: 100, y: 50 })
    expect(layout.ranksIn(60, 140, 100)).toEqual({ from: 3, to: 9 })
    expect(layout.extent(7)).toEqual({ height: 150 })
    width.set(90)
    expect([layout.columns.get(), heard]).toEqual([1, 1])
    expect(layout.place(4)).toEqual({ height: 50, width: 100, x: 0, y: 200 })
  })
})
