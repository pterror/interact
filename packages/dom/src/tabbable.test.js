import { afterAll, describe, expect, test } from 'bun:test'

import { BROWSERS, closeBrowser, inBrowser } from '../../../test/browser.js'

afterAll(closeBrowser)

describe.each(BROWSERS)('Tab stops, in %s', (engine) => {
  test('are the ones Tab visits, in its order, through shadow roots and slots, and go round only at the edges', async () => {
    const seen = await inBrowser({ engine, moduleUrl: import.meta.url }, async () => {
      const { tabStops } = await import('./test-trees.js')
      return tabStops()
    })
    expect(seen).toEqual({
      stops: ['first', 'a', 'r2', 'inner', 'slotted'],
      wrapsAtEnd: true,
      wrapsBackAtStart: true,
      wrapsInMiddle: false,
    })
  })
})
