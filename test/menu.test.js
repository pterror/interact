/**
 * Case 4, a menu button with submenus, in every browser: each level is a popover whose keys are bound on itself, opened
 * and closed by keys, the pointer resting, Escape and a press outside, placed against what opened it, with focus
 * following, and told to a screen reader by its attributes.
 * @import { Page } from 'playwright-core'
 * @import { MenuSeen } from './page-menu.js'
 */

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { BROWSERS, BROWSER_SETUP_MS, audit, startBrowsers, stopBrowsers, withPage } from './browser.js'

/** Longer than the page's pointer rest, for the pointer to count */
const RESTED_MS = 150

beforeAll(startBrowsers, BROWSER_SETUP_MS)
afterAll(stopBrowsers, BROWSER_SETUP_MS)

/**
 * What the menu shows, once focus has moved
 * @param {Page} page - The page
 * @returns {Promise<MenuSeen>} What shows
 */
async function look(page) {
  return page.evaluate(async () => {
    await Promise.resolve()
    const menu = await import('./page-menu.js')
    return menu.seenMenu()
  })
}

/**
 * Puts the menu in the page and focuses its button
 * @param {Page} page - The page
 * @returns {Promise<void>} When it is in place
 */
async function putMenu(page) {
  await page.evaluate(async () => {
    const menu = await import('./page-menu.js')
    menu.putMenu()
  })
  await page.focus('button')
}

describe.each(BROWSERS)('a menu with submenus, in %s', (engine) => {
  test('moves, opens and closes levels by keys bound on each level, inside its popover', async () => {
    await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      await putMenu(page)
      await page.keyboard.press('ArrowDown')
      expect(await look(page)).toMatchObject({
        active: { Edit: 'Cut' },
        expanded: 'true',
        focused: 'Edit',
        open: ['Edit'],
      })
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowRight')
      expect(await look(page)).toMatchObject({
        active: { Edit: 'Find', Find: 'Find…' },
        focused: 'Find',
        open: ['Edit', 'Find'],
        submenus: { Find: 'true', Share: 'false' },
      })
      expect(await audit(page, '[role=menu]')).toEqual([])
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowLeft')
      expect(await look(page)).toMatchObject({ focused: 'Edit', open: ['Edit'], submenus: { Find: 'false' } })
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('Enter')
      expect(await look(page)).toMatchObject({ active: { Share: 'Email' }, focused: 'Share', open: ['Edit', 'Share'] })
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('Enter')
      expect(await look(page)).toMatchObject({ expanded: 'false', focused: 'button', open: [], ran: 'Link' })
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('Escape')
      expect(await look(page)).toMatchObject({ focused: 'button', open: [] })
    })
  })

  test('opens the submenu the pointer rests on, not those it crosses, beside its item', async () => {
    await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      await putMenu(page)
      await page.click('button')
      await page.hover('#menu-Edit-Find')
      await page.hover('#menu-Edit-Share')
      await page.waitForTimeout(RESTED_MS)
      expect(await look(page)).toMatchObject({ active: { Edit: 'Share' }, open: ['Edit', 'Share'] })
      const placed = await page.evaluate(async () => {
        const menu = await import('./page-menu.js')
        return menu.placement('Share', 'Share')
      })
      expect(Math.abs(placed.menuLeft - placed.itemRight)).toBeLessThan(1)
      expect(Math.abs(placed.menuTop - placed.itemTop)).toBeLessThan(1)
      await page.hover('#menu-Share-Email')
      await page.waitForTimeout(RESTED_MS)
      await page.click('#menu-Share-Email')
      expect(await look(page)).toMatchObject({ focused: 'button', open: [], ran: 'Email' })
    })
  })

  test('closes on a press outside, and opens with focus in it again', async () => {
    await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      await putMenu(page)
      await page.click('button')
      expect(await look(page)).toMatchObject({ focused: 'Edit', open: ['Edit'] })
      await page.mouse.click(5, 300)
      expect(await look(page)).toMatchObject({ expanded: 'false', open: [] })
      await page.click('button')
      expect(await look(page)).toMatchObject({ focused: 'Edit', open: ['Edit'] })
    })
  })
})
