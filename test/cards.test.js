/**
 * Five thousand cards in a grid, drawn only around what is in view, in every browser: moved through in two
 * directions by keys, picked by keys and clicks, reflowed when the width changes, and told to a screen reader.
 * @import { Page } from 'playwright-core'
 * @import { CardsSeen } from './page-cards.js'
 */

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { BROWSERS, BROWSER_SETUP_MS, audit, startBrowsers, stopBrowsers, withPage } from './browser.js'

/** How long scrolling and drawing get to settle after a step */
const SETTLE_MS = 100

beforeAll(startBrowsers, BROWSER_SETUP_MS)
afterAll(stopBrowsers, BROWSER_SETUP_MS)

/**
 * What the grid shows once what it was told to do has settled
 * @param {Page} page - The page
 * @param {string} [active] - The card that should become active
 * @returns {Promise<CardsSeen>} What shows
 */
async function look(page, active) {
  if (active !== undefined) {
    await page.waitForFunction((text) => {
      const named = document.querySelector('[role=listbox]')?.getAttribute('aria-activedescendant')
      return (
        named !== null && named !== undefined && document.querySelector(`#${CSS.escape(named)}`)?.textContent === text
      )
    }, active)
  }
  await page.waitForTimeout(SETTLE_MS)
  return page.evaluate(async () => {
    const grid = await import('./page-cards.js')
    return grid.seenCards()
  })
}

describe.each(BROWSERS)('a grid of five thousand cards, in %s', (engine) => {
  test('moves across and down, picks, reflows, and draws only a few', async () => {
    await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      await page.evaluate(async () => {
        const grid = await import('./page-cards.js')
        grid.putCards()
      })
      await page.focus('[role=listbox]')
      const start = await look(page)
      expect(start.drawn).toBeLessThan(40)
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('ArrowRight')
      expect(await look(page, 'Card 2')).toMatchObject({ position: '2' })
      const { columns } = await look(page)
      expect(columns).toBeGreaterThan(1)
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('Space')
      const down = `Card ${String(2 + 3 * columns)}`
      expect(await look(page, down)).toMatchObject({ inView: true, selected: [down] })
      await page.evaluate(async () => {
        const grid = await import('./page-cards.js')
        grid.widen(700)
      })
      const wide = await look(page)
      expect(wide.columns).toBeGreaterThan(columns)
      await page.keyboard.press('ArrowUp')
      expect(await look(page, `Card ${String(2 + 3 * columns - wide.columns)}`)).toMatchObject({ inView: true })
      await page.keyboard.press('End')
      expect(await look(page, 'Card 5000')).toMatchObject({ inView: true, position: '5000' })
      await page.click('[role=option] >> nth=3')
      const picked = await look(page)
      expect(picked.selected).toEqual([picked.active ?? ''])
      expect(picked.drawn).toBeLessThan(60)
      expect(await audit(page, '[role=listbox]')).toEqual([])
    })
  })
})
