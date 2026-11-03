import { afterAll, describe, expect, test } from 'bun:test'

import { BROWSERS, closeBrowser, inBrowser } from '../../../test/browser.js'

const GAP = 4
const MARGIN = 8
const WIDTH = 120
const FROM_BOTTOM = 30
const SCROLLED_ANCHOR_BOTTOM = 220

afterAll(closeBrowser)

describe.each(BROWSERS)('anchored positioning, in %s', (engine) => {
  test('places an overlay below an element in the page, lined up with its start', async () => {
    const seen = await inBrowser({ engine, moduleUrl: import.meta.url }, async () => {
      const { anchorAt, placed } = await import('./test-anchored.js')
      return placed(anchorAt({ x: 100, y: 100 }))
    })
    expect(seen).toMatchObject({ side: 'block-end', x: 100, y: 124 })
  })

  test('places it at a point', async () => {
    const seen = await inBrowser({ engine, moduleUrl: import.meta.url }, async () => {
      const { placed } = await import('./test-anchored.js')
      return placed({ x: 300, y: 200 })
    })
    expect(seen).toMatchObject({ side: 'block-end', x: 300, y: 204 })
  })
})

describe.each(BROWSERS)('anchored positioning near the edges, in %s', (engine) => {
  test('flips above an element at the bottom of the window', async () => {
    const seen = await inBrowser({ engine, moduleUrl: import.meta.url }, async () => {
      const { placed } = await import('./test-anchored.js')
      return { spot: placed('bottom'), window: innerHeight }
    })
    expect(seen.spot.side).toBe('block-start')
    expect(seen.spot.y + seen.spot.height + GAP).toBe(seen.window - FROM_BOTTOM)
  })

  test('moves along to stay inside the window at its right edge', async () => {
    const seen = await inBrowser({ engine, moduleUrl: import.meta.url }, async () => {
      const { placed } = await import('./test-anchored.js')
      return { right: document.documentElement.clientWidth, spot: placed('right') }
    })
    expect(seen.spot.x).toBe(seen.right - MARGIN - WIDTH)
  })

  test('shrinks to the room it has when it fits on neither side', async () => {
    const seen = await inBrowser({ engine, moduleUrl: import.meta.url }, async () => {
      const { shrunk } = await import('./test-anchored.js')
      return shrunk()
    })
    expect(seen.spot.side).toBe('block-end')
    expect(seen.spot.y + seen.spot.height).toBe(seen.window - MARGIN)
    expect(seen.spot.availableHeight).toBe(`${String(seen.spot.height)}px`)
  })
})

describe.each(BROWSERS)('anchored positioning while the page scrolls, in %s', (engine) => {
  test('follows its anchor as the page scrolls', async () => {
    const seen = await inBrowser({ engine, moduleUrl: import.meta.url }, async () => {
      const { scrolled } = await import('./test-anchored.js')
      return scrolled()
    })
    expect(seen.before.y).toBe(SCROLLED_ANCHOR_BOTTOM + GAP)
    expect(seen.after.y).toBe(seen.anchorAfter + GAP)
  })
})
