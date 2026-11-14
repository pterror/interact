/**
 * `popover` kept inside the window in every browser, against an element (placed by the browser where it has CSS Anchor
 * Positioning) and against a point (placed by `popover`): flipped to the anchor's other side across or along when it
 * would come within 8 px of an edge it grows towards.
 * @import { Page } from 'playwright-core'
 * @import { PopoverSeen } from './page-popover.js'
 */

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { BROWSERS, BROWSER_SETUP_MS, startBrowsers, stopBrowsers, withPage } from './browser.js'

/** Long enough for a frame to be drawn, in ms */
const FRAME_MS = 50

beforeAll(startBrowsers, BROWSER_SETUP_MS)
afterAll(stopBrowsers, BROWSER_SETUP_MS)

/**
 * Shows a popover and says where it is
 * @param {Page} page - The page
 * @param {Readonly<{ x: number, y: number, point: boolean, side: 'below' | 'right' | 'left' }>} at - Where its anchor
 *   is, whether it is a point, and the side
 * @returns {Promise<PopoverSeen>} Where it is
 */
async function shown(page, at) {
  await page.evaluate(async (where) => {
    const popover = await import('./page-popover.js')
    popover.putPopover(where)
  }, at)
  await page.waitForTimeout(FRAME_MS)
  return page.evaluate(async () => {
    const popover = await import('./page-popover.js')
    return popover.seenPopover()
  })
}

describe.each(BROWSERS)('popover, in %s', (engine) => {
  for (const point of [false, true]) {
    const against = point ? 'a point' : 'an element'
    test(`against ${against}, stays below where it fits`, async () => {
      await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
        const { anchor, box } = await shown(page, { point, side: 'below', x: 100, y: 100 })
        expect([box.left, box.top]).toEqual([anchor.left, anchor.bottom])
      })
    })

    test(`against ${against}, flips along near the right edge and across near the bottom`, async () => {
      await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
        const size = await page.evaluate(() => ({
          height: document.documentElement.clientHeight,
          width: document.documentElement.clientWidth,
        }))
        const { anchor, box, byBrowser, window } = await shown(page, {
          point,
          side: 'below',
          x: size.width - 100,
          y: size.height - 60,
        })
        expect([box.right, box.bottom]).toEqual([anchor.right, anchor.top])
        expect(box.left).toBeGreaterThanOrEqual(8)
        expect(box.right).toBeLessThanOrEqual(window.width)
        if (point) {
          expect(byBrowser).toBe(false)
        }
      })
    })

    test(`against ${against}, beside on the left, flips to the right at the left edge`, async () => {
      await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
        const { anchor, box } = await shown(page, { point, side: 'left', x: 20, y: 100 })
        expect([box.left, box.top]).toEqual([anchor.right, anchor.top])
      })
    })
  }

  test('against an element, is placed by the browser where it has anchor positioning', async () => {
    await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      const { byBrowser } = await shown(page, { point: false, side: 'below', x: 100, y: 100 })
      const supported = await page.evaluate(() => CSS.supports('position-try-fallbacks', 'flip-block'))
      expect(byBrowser).toBe(supported)
    })
  })
})
