/**
 * Half a million grouped options, drawn only around what is in view, in every browser: moved through by keys,
 * picked by keys and clicks, scrolled, and told to a screen reader as one list of half a million.
 * @import { Page } from 'playwright-core'
 * @import { WindowedSeen } from './page-windowed.js'
 */

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { BROWSERS, BROWSER_SETUP_MS, audit, startBrowsers, stopBrowsers, withPage } from './browser.js'

/** How long scrolling and drawing get to settle after a step */
const SETTLE_MS = 100

beforeAll(startBrowsers, BROWSER_SETUP_MS)
afterAll(stopBrowsers, BROWSER_SETUP_MS)

/**
 * What the list shows once what it was told to do has settled: the active option drawn, and two frames passed
 * @param {Page} page - The page
 * @param {string} [active] - The option that should become active
 * @returns {Promise<WindowedSeen>} What shows
 */
async function look(page, active) {
  if (active !== undefined) {
    await page.waitForFunction((text) => {
      const box = document.querySelector('[role=listbox]')
      const named = box?.getAttribute('aria-activedescendant')
      return (
        named !== null && named !== undefined && document.querySelector(`#${CSS.escape(named)}`)?.textContent === text
      )
    }, active)
  }
  await page.waitForTimeout(SETTLE_MS)
  return page.evaluate(async () => {
    const windowed = await import('./page-windowed.js')
    return windowed.seenWindowed()
  })
}

describe.each(BROWSERS)('half a million grouped options drawn by the screen, in %s', (engine) => {
  test('moves, picks and scrolls through all of them, drawing only a few', async () => {
    await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      await page.evaluate(async () => {
        const windowed = await import('./page-windowed.js')
        windowed.putWindowed()
      })
      await page.focus('[role=listbox]')
      const start = await look(page)
      expect(start.drawn).toBeLessThan(40)
      await page.keyboard.press('End')
      expect(await look(page, 'Option 500000')).toMatchObject({
        group: 'Group 50000',
        inView: true,
        position: '500000',
        size: '500000',
      })
      await page.keyboard.press('Home')
      const first = await look(page, 'Option 1')
      expect(first).toMatchObject({ group: 'Group 1', inView: true })
      expect(first.scrolled).toBeLessThanOrEqual(24)
      for (const _ of Array.from({ length: 10 })) {
        // oxlint-disable-next-line no-await-in-loop -- one key after another
        await page.keyboard.press('ArrowDown')
      }
      await page.keyboard.press('Space')
      expect(await look(page, 'Option 11')).toMatchObject({ group: 'Group 2', inView: true, selected: ['Option 11'] })
      await page.keyboard.press('PageDown')
      expect(await look(page, 'Option 21')).toMatchObject({ inView: true })
      await page.evaluate(async () => {
        const windowed = await import('./page-windowed.js')
        windowed.scrollTo(0.5)
      })
      const middle = await look(page)
      expect(middle.drawn).toBeLessThan(50)
      expect(middle.active).toBe('Option 21')
      await page.click('[role=option] >> nth=15')
      const picked = await look(page)
      expect(picked.selected).toEqual([picked.active ?? ''])
      expect(Number(picked.position)).toBeGreaterThan(200_000)
      expect(await audit(page, '[role=listbox]')).toEqual([])
    })
  })

  test('never names an element that is not drawn, while the list answers late as a server would', async () => {
    await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      await page.evaluate(async () => {
        const windowed = await import('./page-windowed.js')
        windowed.putWindowed({ late: true })
      })
      await page.focus('[role=listbox]')
      await page.keyboard.press('ArrowDown')
      expect(await look(page, 'Option 1')).toMatchObject({ inView: true })
      await page.keyboard.press('End')
      expect(await look(page, 'Option 500000')).toMatchObject({ inView: true })
      await page.keyboard.press('Home')
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowDown')
      expect(await look(page, 'Option 3')).toMatchObject({ inView: true })
      const wrong = await page.evaluate(async () => {
        const windowed = await import('./page-windowed.js')
        return windowed.wronglyNamed()
      })
      expect(wrong).toEqual([])
    })
  })
})
