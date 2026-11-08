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

  test('closes and opens regions by Left and Right, moves to heads and members, and skips what is closed', async () => {
    await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      await page.evaluate(async () => {
        const overview = await import('./page-overview.js')
        overview.putOverview()
      })
      await page.focus('[role=tree]')
      expect(await press(page, 'ArrowDown')).toMatchObject({ active: 'Region 0', depth: 0 })
      const expanded = async (/** @type {string} */ key) =>
        page.locator(`[data-key="${key}"]`).getAttribute('aria-expanded')
      const drawnMembers = async (/** @type {string} */ key) => page.locator(`[data-key^="${key}/"]`).count()
      for (const [key, active, depth] of [
        ['ArrowLeft', 'Region 0 (4 members)', 0],
        ['ArrowDown', 'Entry 1', 0],
        ['ArrowUp', 'Region 0 (4 members)', 0],
      ]) {
        // oxlint-disable-next-line no-await-in-loop -- one key after another
        expect(await press(page, String(key))).toMatchObject({ active, depth, focused: true, inView: true })
      }
      expect([await expanded('E0'), await drawnMembers('E0')]).toEqual(['false', 0])
      for (const [key, active, depth] of [
        ['ArrowRight', 'Region 0', 0],
        ['ArrowRight', 'Region M0.0', 1],
        ['ArrowLeft', 'Region M0.0 (5 members)', 1],
        ['ArrowDown', 'Entry M0.1', 1],
        ['ArrowRight', 'Entry M0.1', 1],
        ['ArrowLeft', 'Region 0', 0],
        ['ArrowDown', 'Region M0.0 (5 members)', 1],
        ['ArrowLeft', 'Region 0', 0],
      ]) {
        // oxlint-disable-next-line no-await-in-loop -- one key after another
        expect(await press(page, String(key))).toMatchObject({ active, depth, focused: true, inView: true })
      }
      expect([await expanded('E0'), await expanded('E0/M0.0'), await drawnMembers('E0/M0.0')]).toEqual([
        'true',
        'false',
        0,
      ])
      expect(await audit(page, '[role=tree]')).toEqual([])
    })
  })

  test('moves the active item to the head of a region closed around it', async () => {
    await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      await page.evaluate(async () => {
        const overview = await import('./page-overview.js')
        overview.putOverview()
      })
      await page.focus('[role=tree]')
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowDown')
      expect(await press(page, 'ArrowDown')).toMatchObject({ active: 'Entry M0.0.0', depth: 2 })
      await page.evaluate(async () => {
        const overview = await import('./page-overview.js')
        await overview.closeRegion('E0')
      })
      expect(await look(page)).toMatchObject({ active: 'Region 0 (4 members)', depth: 0, focused: true, inView: true })
    })
  })

  test('keeps what is on screen in place when a region above it is closed or opened', async () => {
    await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      await page.evaluate(async () => {
        const overview = await import('./page-overview.js')
        overview.putOverview()
        overview.scrollToFraction(0.5)
      })
      await page.waitForTimeout(SETTLE_MS * 2)
      const tops = async () =>
        page.evaluate(async () => {
          const overview = await import('./page-overview.js')
          return overview.topsInView().map(({ text, top }) => [text, top])
        })
      const before = await tops()
      const region = await page.evaluate(async () => {
        const overview = await import('./page-overview.js')
        return overview.regionAboveView()
      })
      expect(region).toBeDefined()
      for (const close of [true, false]) {
        // oxlint-disable-next-line no-await-in-loop -- each change is made and looked at before the next
        await page.evaluate(
          async (/** @type {Readonly<{ key: string, close: boolean }>} */ change) => {
            const overview = await import('./page-overview.js')
            if (change.close) {
              await overview.closeRegion(change.key)
            } else {
              overview.openRegion(change.key)
            }
          },
          { close, key: region ?? '' },
        )
        // oxlint-disable-next-line no-await-in-loop -- each change is made and looked at before the next
        await page.waitForTimeout(SETTLE_MS)
        // oxlint-disable-next-line no-await-in-loop -- each change is made and looked at before the next
        expect(await tops()).toEqual(before)
      }
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
      const tileId = await page.evaluate(async () => {
        const overview = await import('./page-overview.js')
        return overview.idOf('E3/+')
      })
      const tile = page.locator(`#${tileId}`)
      expect(await tile.locator(':scope > div').first().textContent()).toBe('+4 more')
      await tile.evaluate((element) => {
        if (element instanceof HTMLElement) {
          element.dataset['seen'] = ''
        }
      })
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
      expect(await tile.locator(':scope > div').first().textContent()).toBe('+5 more')
      expect(await tile.getAttribute('data-seen')).toBe('')
      expect(await audit(page, '[role=tree]')).toEqual([])
    })
  })

  test('keeps what is on screen in place when entries are added or removed above it, in the middle of 100,000', async () => {
    await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      await page.evaluate(async () => {
        const overview = await import('./page-overview.js')
        overview.putOverview()
        overview.scrollToFraction(0.5)
      })
      await page.waitForTimeout(SETTLE_MS * 2)
      const tops = async () =>
        page.evaluate(async () => {
          const overview = await import('./page-overview.js')
          return overview.topsInView()
        })
      const before = await tops()
      expect(before.length).toBeGreaterThan(2)
      const first = Number(before[0]?.position)
      expect(first).toBeGreaterThan(40_000)
      /** @type {readonly (readonly ['insert' | 'remove', number, number])[]} */
      const edits = [
        ['insert', 2, 3],
        ['insert', 40, 50],
        ['remove', 3, 2],
        ['remove', 200, 30],
        ['insert', first - 10, 1000],
      ]
      let moved = 0
      for (const [kind, above, count] of edits) {
        // oxlint-disable-next-line no-await-in-loop -- each edit is made and looked at before the next
        await page.evaluate(
          async (/** @type {Readonly<{ what: string, back: number, many: number }>} */ edit) => {
            const overview = await import('./page-overview.js')
            const at = overview.firstInView() - edit.back
            if (edit.what === 'insert') {
              overview.insertTop(at, edit.many)
            } else {
              overview.removeTop(at, edit.many)
            }
          },
          { back: above, many: count, what: kind },
        )
        moved += kind === 'insert' ? count : -count
        // oxlint-disable-next-line no-await-in-loop -- each edit is made and looked at before the next
        await page.waitForTimeout(SETTLE_MS)
        // oxlint-disable-next-line no-await-in-loop -- each edit is made and looked at before the next
        const after = await tops()
        expect(after.map(({ text, top }) => [text, top])).toEqual(before.map(({ text, top }) => [text, top]))
        expect(after[0]?.position).toBe(String(first + moved))
      }
    })
  })
})
