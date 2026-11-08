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

  test('drags a card to another place, scrolling near the edge, and moves the active card by keys', async () => {
    await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      await page.evaluate(async () => {
        const grid = await import('./page-cards.js')
        grid.putCards()
      })
      await page.waitForTimeout(SETTLE_MS)
      const card = (/** @type {string} */ name) =>
        page.locator('[role=option]', { hasText: new RegExp(`^${name}$`, 'u') })
      const one = await card('Card 1').boundingBox()
      const three = await card('Card 3').boundingBox()
      if (one === null || three === null) {
        throw new Error('The cards are not drawn')
      }
      await page.mouse.move(one.x + one.width / 2, one.y + one.height / 2)
      await page.mouse.down()
      await page.mouse.move(three.x + three.width * 0.8, three.y + three.height / 2, { steps: 5 })
      expect(await card('Card 3').getAttribute('data-drop-after')).toBe('')
      expect(await card('Card 1').getAttribute('data-dragging')).toBe('')
      await page.mouse.up()
      await page.waitForTimeout(SETTLE_MS)
      const order = async () =>
        page.evaluate(async () => {
          const grid = await import('./page-cards.js')
          return grid.order(4)
        })
      expect(await order()).toEqual(['Card 2', 'Card 3', 'Card 1', 'Card 4'])
      const afterDrop = await look(page)
      expect(afterDrop.selected).toEqual([])
      expect(await page.locator('[data-drop-after], [data-dragging]').count()).toBe(0)

      await card('Card 2').click()
      await page.keyboard.press('Alt+ArrowRight')
      await page.waitForTimeout(SETTLE_MS)
      expect(await order()).toEqual(['Card 3', 'Card 2', 'Card 1', 'Card 4'])
      expect(await look(page, 'Card 2')).toMatchObject({ selected: ['Card 2'] })

      const four = await card('Card 4').boundingBox()
      const view = await page.locator('[role=listbox] >> xpath=..').boundingBox()
      if (four === null || view === null) {
        throw new Error('Card 4 is not drawn')
      }
      await page.mouse.move(four.x + four.width / 2, four.y + four.height / 2)
      await page.mouse.down()
      await page.mouse.move(four.x + four.width / 2 + 30, view.y + view.height - 6, { steps: 5 })
      await page.waitForTimeout(800)
      await page.mouse.move(four.x + four.width / 2 + 31, view.y + view.height - 40, { steps: 2 })
      await page.mouse.up()
      await page.waitForTimeout(SETTLE_MS)
      const moved = await page.evaluate(async () => {
        const grid = await import('./page-cards.js')
        return grid.indexOf('Card 4')
      })
      expect(moved).toBeGreaterThan(12)
      expect(await audit(page, '[role=listbox]')).toEqual([])
    })
  })
})
