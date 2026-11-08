/**
 * The worldbuilding overview in every browser: a hundred thousand top-level entries drawn near what is in view,
 * regions nested three deep and cut short with "+N more" tiles, a region cut where it recurs, and an entry in two
 * regions. Moved through by keys across region edges both ways, chosen by entry, focus kept on the tree, an entry
 * dragged into another region, and checked by axe.
 * @import { Page } from 'playwright-core'
 * @import { OverviewSeen } from './page-overview.js'
 */

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { BROWSERS, BROWSER_SETUP_MS, audit, startBrowsers, stopBrowsers, withPage } from './browser.js'

/** How long scrolling, measuring and drawing get to settle after a step */
const SETTLE_MS = 150

beforeAll(startBrowsers, BROWSER_SETUP_MS)
afterAll(stopBrowsers, BROWSER_SETUP_MS)

/**
 * What the overview shows once settled
 * @param {Page} page - The page
 * @returns {Promise<OverviewSeen>} What shows
 */
async function look(page) {
  await page.waitForTimeout(SETTLE_MS)
  return page.evaluate(async () => {
    const overview = await import('./page-overview.js')
    return overview.seenOverview()
  })
}

/**
 * Presses a key, and gives what then shows
 * @param {Page} page - The page
 * @param {string} key - The key
 * @returns {Promise<OverviewSeen>} What shows
 */
async function press(page, key) {
  await page.keyboard.press(key)
  return look(page)
}

/**
 * A region's members
 * @param {Page} page - The page
 * @param {string} region - The region's entry
 * @returns {Promise<readonly string[]>} Its members
 */
async function members(page, region) {
  return page.evaluate(async (entry) => {
    const overview = await import('./page-overview.js')
    return overview.membersNow(entry)
  }, region)
}

describe.each(BROWSERS)('the worldbuilding overview, in %s', (engine) => {
  test('moves through nested regions by keys, both ways, and draws only near what is in view', async () => {
    await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      await page.evaluate(async () => {
        const overview = await import('./page-overview.js')
        overview.putOverview()
      })
      await page.focus('[role=tree]')
      const start = await look(page)
      expect(start.drawnTop).toBeLessThan(60)
      const down = [
        ['Region 0', 0],
        ['Region M0.0', 1],
        ['Entry M0.0.0', 2],
        ['Region 0 (shown above)', 2],
        ['Entry M0.0.2', 2],
        ['+2 more', 2],
        ['Entry M0.1', 1],
        ['Shared entry', 1],
        ['+1 more', 1],
        ['Entry 1', 0],
      ]
      for (const [active, depth] of down) {
        // oxlint-disable-next-line no-await-in-loop -- one key after another
        expect(await press(page, 'ArrowDown')).toMatchObject({ active, depth, focused: true, inView: true })
      }
      for (const [active, depth] of down.toReversed().slice(1, 3)) {
        // oxlint-disable-next-line no-await-in-loop -- one key after another
        expect(await press(page, 'ArrowUp')).toMatchObject({ active, depth })
      }
      const chosen = await press(page, 'Space')
      const shared = await page.locator('[role=treeitem] > div:first-child', { hasText: /^Shared entry$/u }).count()
      expect(chosen.active).toBe('Shared entry')
      expect(shared).toBeGreaterThan(1)
      expect(chosen.selected).toBe(shared)
      expect(await press(page, 'End')).toMatchObject({ active: '+5 more', depth: 1, inView: true, position: '100000' })
      expect(await press(page, 'ArrowUp')).toMatchObject({ active: 'Shared entry', inView: true })
      expect(await press(page, 'Home')).toMatchObject({ active: 'Region 0', depth: 0, inView: true, position: '1' })
      const end = await look(page)
      expect(end.drawn).toBeLessThan(400)
      expect(await audit(page, '[role=tree]')).toEqual([])
    })
  })

  test('drags an entry from one region into another', async () => {
    await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      await page.evaluate(async () => {
        const overview = await import('./page-overview.js')
        overview.putOverview()
      })
      await page.waitForTimeout(SETTLE_MS)
      const head = async (/** @type {string} */ key) => {
        const id = await page.evaluate(async (occurrence) => {
          const overview = await import('./page-overview.js')
          return overview.idOf(occurrence)
        }, key)
        const box = await page.locator(`#${id}-head`).boundingBox()
        if (box === null) {
          throw new Error(`${key} is not drawn`)
        }
        return box
      }
      const from = await head('E0/M0.1')
      const to = await head('E3/M3.1')
      await page.mouse.move(from.x + 20, from.y + from.height / 2)
      await page.mouse.down()
      await page.mouse.move(to.x + 20, to.y + to.height * 0.9, { steps: 8 })
      await page.mouse.up()
      const seen = await look(page)
      expect(await members(page, 'E0')).not.toContain('M0.1')
      expect(await members(page, 'E3')).toEqual(['M3.0', 'M3.1', 'M0.1', 'Shared', 'M3.3', 'M3.4', 'M3.5', 'M3.6'])
      const moved = page.locator('[role=treeitem]', { hasText: /^Entry M0\.1$/u })
      const texts = await page.locator('[role=treeitem] > div:first-child').allTextContents()
      expect(texts.filter((text) => text === 'Entry M0.1')).toHaveLength(1)
      expect(await moved.count()).toBe(1)
      expect(seen.selected).toBe(0)
      expect(await audit(page, '[role=tree]')).toEqual([])
    })
  })
})
