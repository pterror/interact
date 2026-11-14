/**
 * A browser-like tab strip built only from list's modules, in every browser: a dragged tab follows the pointer, the
 * tabs it passes move aside as its leading edge enters them, a small move back changes nothing, and a dropped tab
 * slides from where it was let go into its place once the reorder has changed the list, or back if it is refused.
 * The tab keeps to the pointer while the strip scrolls or tabs come and go under it, and can be grabbed mid-slide.
 * @import { Page } from 'playwright-core'
 * @import { TabsSeen } from './page-tabs.js'
 */

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { BROWSERS, BROWSER_SETUP_MS, startBrowsers, stopBrowsers, withPage } from './browser.js'

/** Where the pointer is down the strip, in px */
const Y = 8
/** How long a scroll takes to be heard, in ms */
const SCROLLED_MS = 100

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

/**
 * Each tab, where it is drawn across and whether it slides, in order
 * @param {TabsSeen} seen - What shows
 * @returns {(string | number | boolean)[][]} The tabs
 */
function placed(seen) {
  return seen.tabs.map((tab) => [tab.key, tab.left, tab.sliding])
}

/**
 * Where a tab is drawn across
 * @param {TabsSeen} seen - What shows
 * @param {string} key - The tab
 * @returns {number | undefined} Its left edge, if it is drawn
 */
function leftOf(seen, key) {
  return seen.tabs.find((tab) => tab.key === key)?.left
}

/**
 * Puts the strip
 * @param {Page} page - The page
 * @param {'now' | 'late' | 'refused'} answers - How its reorder answers
 * @returns {Promise<Readonly<{ settle: number, late: number, room: number }>>} How long a dropped tab slides, a
 *   reorder takes to answer, and tabs slide aside
 */
async function putTabs(page, answers) {
  return page.evaluate(async (how) => {
    const strip = await import('./page-tabs.js')
    strip.putTabs(how)
    return { late: strip.LATE_MS, room: strip.ROOM_MS, settle: strip.SETTLE_MS }
  }, answers)
}

/**
 * Drags tab a past b and c and lets go there, once they have slid aside
 * @param {Page} page - The page
 * @param {number} room - How long they take to
 * @returns {Promise<void>} When it is let go
 */
async function dropPastC(page, room) {
  await page.mouse.move(50, Y)
  await page.mouse.down()
  await page.mouse.move(60, Y)
  await page.mouse.move(200, Y)
  expect(shifts(await look(page))).toEqual([150, -110, -110, 0])
  await page.waitForTimeout(room + 50)
  await page.mouse.up()
}

describe.each(BROWSERS)('a tab strip, in %s', (engine) => {
  test('drags a tab by its leading edge, making room, and settles it where it is dropped', async () => {
    await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      const { room, settle } = await putTabs(page, 'now')
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
      await page.waitForTimeout(room + 50)
      await page.mouse.up()
      const dropped = await look(page)
      expect(dropped.order).toEqual(['b', 'c', 'a', 'd'])
      expect(dropped.dragging).toEqual([])
      expect(dropped.settling).toEqual(['a'])
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
      expect(settled.settling).toEqual([])
      expect(placed(settled)).toEqual([
        ['b', 0, false],
        ['c', 110, false],
        ['a', 220, false],
        ['d', 330, false],
      ])
    })
  })

  test('holds a drop where it was let go until a late reorder lands, then settles', async () => {
    await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      const { late, room, settle } = await putTabs(page, 'late')
      await dropPastC(page, room)
      const waiting = await look(page)
      expect(waiting.order).toEqual(['a', 'b', 'c', 'd'])
      expect(shifts(waiting)).toEqual([150, -110, -110, 0])
      expect(placed(waiting)).toEqual([
        ['a', 150, false],
        ['b', 0, false],
        ['c', 110, false],
        ['d', 330, false],
      ])
      await page.waitForTimeout(late + 50)
      const landed = await look(page)
      expect(landed.order).toEqual(['b', 'c', 'a', 'd'])
      expect(shifts(landed)).toEqual([0, 0, 0, 0])
      expect(landed.settling).toEqual(['a'])
      await page.waitForTimeout(settle + 100)
      expect(placed(await look(page))).toEqual([
        ['b', 0, false],
        ['c', 110, false],
        ['a', 220, false],
        ['d', 330, false],
      ])
    })
  })

  test('slides everything back to the order as it is when the reorder is refused', async () => {
    await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      const { late, room, settle } = await putTabs(page, 'refused')
      await dropPastC(page, room)
      expect(shifts(await look(page))).toEqual([150, -110, -110, 0])
      await page.waitForTimeout(late + 50)
      const refused = await look(page)
      expect(refused.order).toEqual(['a', 'b', 'c', 'd'])
      expect(shifts(refused)).toEqual([0, 0, 0, 0])
      expect(refused.tabs.map((tab) => tab.sliding)).toEqual([true, true, true, false])
      await page.waitForTimeout(settle + 100)
      expect(placed(await look(page))).toEqual([
        ['a', 0, false],
        ['b', 110, false],
        ['c', 220, false],
        ['d', 330, false],
      ])
    })
  })

  test('slides a cancelled drag back to where it started, and the tabs it passed with it', async () => {
    await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      const { room, settle } = await putTabs(page, 'now')
      await page.mouse.move(50, Y)
      await page.mouse.down()
      await page.mouse.move(60, Y)
      await page.mouse.move(200, Y)
      await page.waitForTimeout(room + 50)
      await page.evaluate(async () => {
        const strip = await import('./page-tabs.js')
        strip.loseTabs()
      })
      await page.waitForTimeout(50)
      const cancelled = await look(page)
      expect(cancelled.order).toEqual(['a', 'b', 'c', 'd'])
      expect(cancelled.dragging).toEqual([])
      expect(cancelled.settling).toEqual(['a'])
      expect(shifts(cancelled)).toEqual([0, 0, 0, 0])
      expect(cancelled.tabs.map((tab) => tab.sliding)).toEqual([true, true, true, false])
      expect(leftOf(cancelled, 'a')).toBeGreaterThan(0)
      await page.mouse.up()
      await page.waitForTimeout(settle + 100)
      expect(placed(await look(page))).toEqual([
        ['a', 0, false],
        ['b', 110, false],
        ['c', 220, false],
        ['d', 330, false],
      ])
    })
  })

  test('keeps the dragged tab under a still pointer while the strip scrolls, and lands it by where it is drawn', async () => {
    await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      await putTabs(page, 'now')
      await page.mouse.move(50, Y)
      await page.mouse.down()
      await page.mouse.move(60, Y)
      await page.mouse.move(75, Y)
      expect(shifts(await look(page))).toEqual([25, -110, 0, 0])
      await page.evaluate(async () => {
        const strip = await import('./page-tabs.js')
        strip.scrollTabs(120)
      })
      await page.waitForTimeout(SCROLLED_MS)
      const scrolled = await look(page)
      expect(leftOf(scrolled, 'a')).toBe(25)
      expect(shifts(scrolled)).toEqual([145, -110, -110, 0])
      await page.mouse.up()
      const dropped = await look(page)
      expect(dropped.order).toEqual(['b', 'c', 'a', 'd'])
    })
  })

  test('slides tabs a change of order moves outside a drag from where they were to their new places', async () => {
    await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      const { room } = await putTabs(page, 'now')
      await page.evaluate(async () => {
        const strip = await import('./page-tabs.js')
        strip.setTabs(['b', 'a', 'c', 'd'])
      })
      const moving = await look(page)
      expect(moving.order).toEqual(['b', 'a', 'c', 'd'])
      expect(moving.tabs.map((tab) => [tab.key, tab.sliding])).toEqual([
        ['b', true],
        ['a', true],
        ['c', false],
        ['d', false],
      ])
      expect(leftOf(moving, 'a')).toBeLessThan(110)
      expect(leftOf(moving, 'b')).toBeGreaterThan(0)
      await page.waitForTimeout(room + 50)
      expect(placed(await look(page))).toEqual([
        ['b', 0, false],
        ['a', 110, false],
        ['c', 220, false],
        ['d', 330, false],
      ])
    })
  })

  test('keeps a drag going as tabs come and go under it, and cancels it when its own tab goes', async () => {
    await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      await putTabs(page, 'now')
      await page.mouse.move(160, Y)
      await page.mouse.down()
      await page.mouse.move(168, Y)
      expect(leftOf(await look(page), 'b')).toBe(118)
      await page.evaluate(async () => {
        const strip = await import('./page-tabs.js')
        strip.setTabs(['z', 'a', 'b', 'c', 'd'])
      })
      const added = await look(page)
      expect(added.dragging).toEqual(['b'])
      expect(leftOf(added, 'b')).toBe(118)
      expect(shifts(added)).toEqual([0, 110, -102, 0, 0])
      await page.mouse.move(178, Y)
      const forward = await look(page)
      expect(leftOf(forward, 'b')).toBe(128)
      expect(shifts(forward)).toEqual([0, 0, -92, 0, 0])
      await page.evaluate(async () => {
        const strip = await import('./page-tabs.js')
        strip.setTabs(['z', 'a', 'c', 'd'])
      })
      const gone = await look(page)
      expect(gone.dragging).toEqual([])
      expect(gone.order).toEqual(['z', 'a', 'c', 'd'])
      await page.mouse.up()
      const released = await look(page)
      expect(released.order).toEqual(['z', 'a', 'c', 'd'])
    })
  })

  test('takes a tab grabbed while it settles from where it is drawn, and stops its slide', async () => {
    await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      const { room } = await putTabs(page, 'now')
      await dropPastC(page, room)
      const settling = leftOf(await look(page), 'a') ?? 0
      await page.mouse.move(settling + 50, Y)
      await page.mouse.down()
      await page.mouse.move(settling + 60, Y)
      const grabbed = await look(page)
      expect(grabbed.settling).toEqual([])
      expect(grabbed.dragging).toEqual(['a'])
      const a = grabbed.tabs.find((tab) => tab.key === 'a')
      expect(a?.sliding).toBe(false)
      expect(a?.left).toBeGreaterThan(150)
      expect(a?.left).toBeLessThan(240)
      await page.mouse.move(settling + 40, Y)
      expect(leftOf(await look(page), 'a')).toBe((a?.left ?? 0) - 20)
      await page.mouse.up()
    })
  })
})
