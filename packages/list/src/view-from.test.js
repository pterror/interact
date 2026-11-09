import { describe, expect, test } from 'bun:test'

import { cell } from './cell.js'
import { viewFrom } from './view-from.js'

describe('viewFrom', () => {
  test('counts the view from the top it is given, follows both, and scrolls the container', () => {
    const shown = cell({ end: 500, start: 100 })
    /** @type {number[]} */
    const scrolled = []
    const visible = { ...shown, scrollBy: (/** @type {number} */ pixels) => scrolled.push(pixels) }
    const top = cell(300)
    const view = viewFrom({ top, visible })
    let heard = 0
    const stop = view.watch(() => {
      heard += 1
    })
    expect(view.get()).toEqual({ end: 200, start: -200 })
    top.set(350)
    expect([view.get(), heard]).toEqual([{ end: 150, start: -250 }, 1])
    shown.set({ end: 900, start: 500 })
    expect([view.get(), heard]).toEqual([{ end: 550, start: 150 }, 2])
    view.scrollBy(40)
    expect(scrolled).toEqual([40])
    stop()
    top.set(0)
    expect(heard).toBe(2)
  })
})
