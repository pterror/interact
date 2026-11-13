import { describe, expect, test } from 'bun:test'

import { cell } from './cell.js'
import { rows } from './rows.js'
import { viewFromBottom } from './view-from-bottom.js'
import { visibleRanks } from './visible-ranks.js'

describe('viewFromBottom', () => {
  test("counts the view up from the list's bottom, follows both, and scrolls the container the other way", () => {
    const shown = cell({ end: 500, start: 100 })
    /** @type {number[]} */
    const scrolled = []
    const visible = { ...shown, scrollBy: (/** @type {number} */ pixels) => scrolled.push(pixels) }
    const bottom = cell(1000)
    const view = viewFromBottom({ bottom, visible })
    let heard = 0
    const stop = view.watch(() => {
      heard += 1
    })
    expect(view.get()).toEqual({ end: 900, start: 500 })
    bottom.set(1200)
    expect([view.get(), heard]).toEqual([{ end: 1100, start: 700 }, 1])
    shown.set({ end: 1200, start: 800 })
    expect([view.get(), heard]).toEqual([{ end: 400, start: 0 }, 2])
    view.scrollBy(40)
    expect(scrolled).toEqual([-40])
    stop()
    bottom.set(0)
    expect(heard).toBe(2)
  })
})

describe('viewFromBottom with visibleRanks', () => {
  test('puts rank 0 in view while the container is scrolled to its end', () => {
    const shown = cell({ end: 3000, start: 2700 })
    const view = viewFromBottom({ bottom: cell(3000), visible: { ...shown, scrollBy: () => undefined } })
    const ranks = visibleRanks({ count: cell(100), layout: rows(30), visible: view })
    expect(ranks.get()).toEqual({ from: 0, to: 10 })
    shown.set({ end: 300, start: 0 })
    expect(ranks.get()).toEqual({ from: 90, to: 100 })
  })
})
