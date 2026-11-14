/**
 * A browser-like tab strip built only from list's modules, in every browser: a dragged tab follows the pointer, the
 * tabs it passes move aside as its leading edge enters them, a small move back changes nothing, and a dropped tab
 * slides from where it was let go into its new place.
 * @import { Page } from 'playwright-core'
 * @import { TabsSeen } from './page-tabs.js'
 */

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { BROWSERS, BROWSER_SETUP_MS, startBrowsers, stopBrowsers, withPage } from './browser.js'

/** Where the pointer is down the strip, in px */
const Y = 8

beforeAll(startBrowsers, BROWSER_SETUP_MS)
afterAll(stopBrowsers, BROWSER_SETUP_MS)

/**
 * What the strip shows now
 * @param {Page} page - The page
 * @returns {Promise<TabsSeen>} What shows
 */
async function look(page) {
  return page.evaluate(async () => {
    const strip = await import('./page-tabs.js')
    return strip.seenTabs()
  })
}

/**
 * How far each tab is drawn from its place across, in px, in order
 * @param {TabsSeen} seen - What shows
 * @returns {number[]} The shifts
 */
function shifts(seen) {
  return seen.tabs.map((tab) => tab.shift)
}

describe.each(BROWSERS)('a tab strip, in %s', (engine) => {
  test('drags a tab by its leading edge, making room, and settles it where it is dropped', async () => {
    await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      const { settle } = await page.evaluate(async () => {
        const strip = await import('./page-tabs.js')
        strip.putTabs()
        return { settle: strip.SETTLE_MS }
      })
      await page.mouse.move(50, Y)
      await page.mouse.down()
      await page.mouse.move(60, Y)
      expect(shifts(await look(page))).toEqual([10, 0, 0, 0])
      await page.mouse.move(75, Y)
      const entered = await look(page)
      expect(entered.dragging).toEqual(['a'])
      expect(shifts(entered)).toEqual([25, -110, 0, 0])
      await page.mouse.move(71, Y)
      expect(shifts(await look(page))).toEqual([21, -110, 0, 0])
      await page.mouse.move(65, Y)
      expect(shifts(await look(page))).toEqual([15, 0, 0, 0])
      await page.mouse.move(200, Y)
      expect(shifts(await look(page))).toEqual([150, -110, -110, 0])
      await page.mouse.up()
      const dropped = await look(page)
      expect(dropped.order).toEqual(['b', 'c', 'a', 'd'])
      expect(dropped.dragging).toEqual([])
      expect(shifts(dropped)).toEqual([0, 0, 0, 0])
      const a = dropped.tabs.find((tab) => tab.key === 'a')
      expect(a?.sliding).toBe(true)
      expect(a?.left).toBeGreaterThanOrEqual(150)
      expect(a?.left).toBeLessThan(220)
      expect(dropped.tabs.filter((tab) => tab.key !== 'a').map((tab) => [tab.left, tab.sliding])).toEqual([
        [0, false],
        [110, false],
        [330, false],
      ])
      await page.waitForTimeout(settle + 100)
      const settled = await look(page)
      expect(settled.tabs.map((tab) => [tab.key, tab.left, tab.sliding])).toEqual([
        ['b', 0, false],
        ['c', 110, false],
        ['a', 220, false],
        ['d', 330, false],
      ])
    })
  })
})
