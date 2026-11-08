/**
 * Entries in a grid grouped by region, drawn only around what is in view, in every browser: headers across the full
 * width, moved through by keys across regions, picked, and dragged within and between regions, including onto a
 * header and while the grid scrolls under a still pointer.
 * @import { Page } from 'playwright-core'
 * @import { RegionsSeen } from './page-regions.js'
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
 * @returns {Promise<RegionsSeen>} What shows
 */
async function look(page) {
  await page.waitForTimeout(SETTLE_MS)
  return page.evaluate(async () => {
    const regions = await import('./page-regions.js')
    return regions.seenRegions()
  })
}

/**
 * Where an entry is
 * @param {Page} page - The page
 * @param {string} key - The entry
 * @returns {Promise<Readonly<{ region: number, index: number }>>} Its region's index, and its index in it
 */
async function whereIs(page, key) {
  return page.evaluate(async (entry) => {
    const regions = await import('./page-regions.js')
    return regions.whereIs(entry)
  }, key)
}

/**
 * A region's entries
 * @param {Page} page - The page
 * @param {number} region - The region's index
 * @returns {Promise<readonly string[]>} Its entries
 */
async function entriesIn(page, region) {
  return page.evaluate(async (index) => {
    const regions = await import('./page-regions.js')
    return regions.entriesIn(index)
  }, region)
}

/**
 * The middle of a drawn item
 * @param {Page} page - The page
 * @param {string} text - Its text
 * @param {number} [across] - How far across it, from 0 to 1 (default the middle)
 * @returns {Promise<Readonly<{ x: number, y: number }>>} The point
 */
async function pointAt(page, text, across = 0.5) {
  const box = await page
    .locator('[role=option], [role=presentation]', { hasText: new RegExp(`^${text}$`, 'u') })
    .boundingBox()
  if (box === null) {
    throw new Error(`${text} is not drawn`)
  }
  return { x: box.x + box.width * across, y: box.y + box.height / 2 }
}

/**
 * Drags from one point to another
 * @param {Page} page - The page
 * @param {Readonly<{ x: number, y: number }>} from - Where it starts
 * @param {Readonly<{ x: number, y: number }>} to - Where it drops
 * @returns {Promise<void>} When dropped
 */
async function dragFrom(page, from, to) {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 6 })
  await page.mouse.up()
  await page.waitForTimeout(SETTLE_MS)
}

describe.each(BROWSERS)('entries grouped by region in a grid, in %s', (engine) => {
  test('draws headers across the width, moves across regions by keys, and draws only a few', async () => {
    await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      await page.evaluate(async () => {
        const regions = await import('./page-regions.js')
        regions.putRegions()
      })
      await page.focus('[role=listbox]')
      const start = await look(page)
      expect(start.headerWidth).toBe(start.gridWidth)
      expect(start.drawn).toBeLessThan(40)
      expect(start.total).toBeGreaterThan(1000)
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowRight')
      let seen = await look(page)
      expect(seen).toMatchObject({ active: 'Entry 2', region: 'Region 2' })
      const regionsSeen = new Set([seen.region])
      for (const _ of Array.from({ length: 8 })) {
        const before = seen
        // oxlint-disable-next-line no-await-in-loop -- one key after another
        await page.keyboard.press('ArrowDown')
        // oxlint-disable-next-line no-await-in-loop -- each step is looked at before the next
        seen = await look(page)
        expect(seen.inView).toBe(true)
        expect(seen.top).toBeGreaterThan(before.top)
        expect(seen.left).toBeLessThanOrEqual(before.left + 1)
        regionsSeen.add(seen.region)
      }
      expect(regionsSeen.size).toBeGreaterThan(2)
      await page.keyboard.press('End')
      expect(await look(page)).toMatchObject({ active: `Entry ${String(start.total)}`, inView: true })
      await page.keyboard.press('Home')
      await page.keyboard.press('Space')
      expect(await look(page)).toMatchObject({ active: 'Entry 1', inView: true, selected: ['Entry 1'] })
      expect(await audit(page, '[role=listbox]')).toEqual([])
    })
  })

  test('drags within and between regions, onto a header, and while scrolling under a still pointer', async () => {
    await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      await page.evaluate(async () => {
        const regions = await import('./page-regions.js')
        regions.putRegions()
      })
      await page.waitForTimeout(SETTLE_MS)
      const [third] = await entriesIn(page, 2)
      if (third === undefined) {
        throw new Error('Region 3 is empty')
      }
      await dragFrom(page, await pointAt(page, 'Entry 1'), await pointAt(page, third, 0.8))
      expect(await whereIs(page, 'Entry 1')).toEqual({ index: 1, region: 2 })
      await dragFrom(page, await pointAt(page, 'Entry 2'), await pointAt(page, 'Region 4'))
      expect(await whereIs(page, 'Entry 2')).toEqual({ index: 0, region: 3 })

      const view = await page.locator('[role=listbox] >> xpath=..').boundingBox()
      if (view === null) {
        throw new Error('The grid is not drawn')
      }
      const from = await pointAt(page, 'Entry 3')
      await page.mouse.move(from.x, from.y)
      await page.mouse.down()
      await page.mouse.move(view.x + 60, view.y + view.height - 8, { steps: 6 })
      const before = await page.evaluate(
        () => document.querySelector('[data-drop-before], [data-drop-after]')?.textContent ?? '',
      )
      await page.waitForTimeout(800)
      await page.mouse.up()
      await page.waitForTimeout(SETTLE_MS)
      const dropped = await whereIs(page, 'Entry 3')
      const target = await whereIs(page, before)
      const near = before.startsWith('Region') ? Number(before.slice('Region '.length)) - 1 : target.region
      expect(dropped.region).toBeGreaterThan(near + 1)

      const fifth = await entriesIn(page, 4)
      const last = fifth.at(-1)
      if (last === undefined) {
        throw new Error('Region 5 is empty')
      }
      await page.locator('[role=listbox] >> xpath=..').evaluate((scroller) => {
        scroller.scrollTop = 0
      })
      await page.waitForTimeout(SETTLE_MS)
      await page.locator('[role=option]', { hasText: new RegExp(`^${last}$`, 'u') }).click()
      await page.keyboard.press('Alt+ArrowRight')
      await page.waitForTimeout(SETTLE_MS)
      expect(await whereIs(page, last)).toEqual({ index: 0, region: 5 })
      expect(await audit(page, '[role=listbox]')).toEqual([])
    })
  })
})
