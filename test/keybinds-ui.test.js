/**
 * The keybinds package's ready-made UI in every browser: the radial menu opens centred on a point in the top layer
 * with its slots placed, takes focus and gives it back, and keeps the page's bindings from firing while open; the
 * cheatsheet opens while its modifier is held and closes as it is let go; the settings panel records a key.
 * @import { Page } from 'playwright-core'
 * @import { CheatsheetSeen, RadialSeen } from './page-keybinds-ui.js'
 */

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { BROWSERS, BROWSER_SETUP_MS, startBrowsers, stopBrowsers, withPage } from './browser.js'

/** Longer than the page's cheatsheet hold, for the hold to count */
const HELD_MS = 150
/** The radial menu's default radius, and its diagonal slots' offsets */
const RADIUS = 100
const DIAGONAL = 71

beforeAll(startBrowsers, BROWSER_SETUP_MS)
afterAll(stopBrowsers, BROWSER_SETUP_MS)

/**
 * What the radial menu shows, once focus has moved
 * @param {Page} page - The page
 * @returns {Promise<RadialSeen>} What shows
 */
async function radial(page) {
  return page.evaluate(async () => {
    await Promise.resolve()
    const ui = await import('./page-keybinds-ui.js')
    return ui.radialSeen()
  })
}

/**
 * What the cheatsheet shows, once focus has moved
 * @param {Page} page - The page
 * @returns {Promise<CheatsheetSeen>} What shows
 */
async function sheet(page) {
  return page.evaluate(async () => {
    await Promise.resolve()
    const ui = await import('./page-keybinds-ui.js')
    return ui.cheatsheetSeen()
  })
}

describe.each(BROWSERS)('the ready-made UI, in %s', (engine) => {
  test('a radial menu opens on its point in the top layer, holds focus and the keys, and gives focus back', async () => {
    await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      await page.evaluate(async () => {
        const ui = await import('./page-keybinds-ui.js')
        ui.putRadial()
      })
      const opened = await radial(page)
      expect(opened).toMatchObject({ focused: 'menu', open: true })
      expect(Math.abs(opened.centre.x - 200)).toBeLessThan(1)
      expect(Math.abs(opened.centre.y - 150)).toBeLessThan(1)
      expect(opened.slots).toEqual([
        [0, -RADIUS],
        [DIAGONAL, -DIAGONAL],
        [RADIUS, 0],
        [DIAGONAL, DIAGONAL],
        [0, RADIUS],
        [-DIAGONAL, DIAGONAL],
        [-RADIUS, 0],
        [-DIAGONAL, -DIAGONAL],
      ])
      expect(opened.onTop).toEqual(Array.from({ length: 8 }, () => true))
      await page.keyboard.press('x')
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('Enter')
      expect(await radial(page)).toMatchObject({ focused: 'Start', open: false, pressed: 0, ran: 'E' })
      await page.keyboard.press('x')
      expect(await radial(page)).toMatchObject({ pressed: 1 })
    })
  })

  test('a cheatsheet opens while its modifier is held, with focus, and closes as it is let go', async () => {
    await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      await page.evaluate(async () => {
        const ui = await import('./page-keybinds-ui.js')
        ui.putCheatsheet()
      })
      await page.keyboard.down('Shift')
      await page.waitForTimeout(HELD_MS)
      expect(await sheet(page)).toEqual({ focused: 'cheatsheet', open: true, rows: ['File', 'OpenCtrlO', 'SaveCtrlS'] })
      await page.keyboard.up('Shift')
      expect(await sheet(page)).toMatchObject({ focused: 'Start', open: false })
    })
  })

  test('a settings panel records the key pressed next', async () => {
    await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      await page.evaluate(async () => {
        const ui = await import('./page-keybinds-ui.js')
        ui.putSettings()
      })
      await page.click('[data-keybinds=add]')
      await page.keyboard.press('Control+k')
      const chips = await page.evaluate(async () => {
        const ui = await import('./page-keybinds-ui.js')
        return ui.settingsChips()
      })
      expect(chips).toEqual([['⌦'], ['Ctrl', 'K']])
    })
  })
})
