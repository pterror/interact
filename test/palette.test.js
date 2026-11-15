/**
 * The command palette and the right-click menu in every browser: each opens from a command bound with keybinds, in the
 * top layer, holds focus and the keys while open, and runs a command, giving focus back.
 * @import { Page } from 'playwright-core'
 * @import { MenuSeen, PaletteSeen } from './page-palette.js'
 */

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { BROWSERS, BROWSER_SETUP_MS, startBrowsers, stopBrowsers, withPage } from './browser.js'

/** Longer than the page's pointer rest */
const RESTED_MS = 60

beforeAll(startBrowsers, BROWSER_SETUP_MS)
afterAll(stopBrowsers, BROWSER_SETUP_MS)

/**
 * The page, with the palette and the menu put in it
 * @param {Page} page - The page
 * @returns {Promise<void>} When they are in
 */
async function put(page) {
  await page.evaluate(async () => {
    const ui = await import('./page-palette.js')
    ui.putPalette()
  })
}

/**
 * What the palette shows, once focus has moved
 * @param {Page} page - The page
 * @returns {Promise<PaletteSeen>} What shows
 */
async function shown(page) {
  return page.evaluate(async () => {
    await Promise.resolve()
    const ui = await import('./page-palette.js')
    return ui.paletteSeen()
  })
}

/**
 * What the menu shows, once focus has moved
 * @param {Page} page - The page
 * @returns {Promise<MenuSeen>} What shows
 */
async function menu(page) {
  return page.evaluate(async () => {
    await Promise.resolve()
    const ui = await import('./page-palette.js')
    return ui.menuSeen()
  })
}

describe.each(BROWSERS)('the palette and the right-click menu, in %s', (engine) => {
  test('the palette opens from its command with the commands that apply, and filters as one types', async () => {
    await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      await put(page)
      await page.keyboard.press('ControlOrMeta+k')
      const opened = await shown(page)
      expect(opened).toMatchObject({ active: 'Copy', focused: 'field', named: true, open: true, query: '' })
      expect(opened.options.map((option) => option.split('|')[0])).toEqual([
        'Copy',
        'Cut',
        'Paste',
        'Close tab',
        'From start',
      ])
      expect(opened.options[0]?.split('|')[1]).toMatch(/^(?:Ctrl|⌘)\+C$/u)
      await page.keyboard.type('c')
      expect(await shown(page)).toMatchObject({ active: 'Copy', query: 'c' })
      await page.keyboard.type('u')
      const narrowed = await shown(page)
      expect(narrowed.options.map((option) => option.split('|')[0])).toEqual(['Cut'])
      await page.keyboard.press('Backspace')
      await page.keyboard.press('Backspace')
      await page.keyboard.type('tab clo')
      expect(await shown(page)).toMatchObject({ active: 'Close tab', options: ['Close tab|'] })
    })
  })

  test('the palette moves with the arrows, wrapping, runs with Enter, and gives focus back', async () => {
    await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      await put(page)
      await page.keyboard.press('ControlOrMeta+k')
      await page.keyboard.press('ArrowUp')
      expect(await shown(page)).toMatchObject({ active: 'From start', named: true })
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowDown')
      expect(await shown(page)).toMatchObject({ active: 'Cut' })
      await page.keyboard.press('Enter')
      expect(await shown(page)).toMatchObject({ focused: 'Start', open: false, ran: ['cut'] })
    })
  })

  test("the palette keeps the page's keys from firing, and closes on Escape or a click outside", async () => {
    await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      await put(page)
      await page.keyboard.press('ControlOrMeta+k')
      await page.keyboard.type('x')
      expect(await shown(page)).toMatchObject({ pressed: 0, query: 'x' })
      await page.keyboard.press('Escape')
      expect(await shown(page)).toMatchObject({ focused: 'Start', open: false, ran: [] })
      await page.keyboard.press('ControlOrMeta+k')
      expect(await shown(page)).toMatchObject({ open: true, query: '' })
      await page.mouse.click(5, 290)
      expect(await shown(page)).toMatchObject({ open: false })
    })
  })

  test('a command runs, and its `when` is asked, where focus was before the palette opened', async () => {
    await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      await put(page)
      await page.keyboard.press('ControlOrMeta+k')
      await page.keyboard.type('from')
      await page.keyboard.press('Enter')
      expect(await shown(page)).toMatchObject({ focused: 'Start', open: false, ran: ['start'] })
    })
  })

  test('a click on an option runs it', async () => {
    await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      await put(page)
      await page.keyboard.press('ControlOrMeta+k')
      await page.click('[role=option]:nth-child(3)')
      expect(await shown(page)).toMatchObject({ open: false, ran: ['paste'] })
    })
  })

  test('a right click opens the menu at the pointer instead of the browser menu, and runs from the keys', async () => {
    await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      await put(page)
      await page.mouse.click(100, 80, { button: 'right' })
      const opened = await menu(page)
      expect(opened).toMatchObject({
        active: 'Copy',
        disabled: ['Never shown'],
        focused: 'menu',
        items: ['Copy', 'Cut', 'Paste', 'Never shown'],
        open: true,
        prevented: true,
      })
      expect(Math.abs(opened.left - 100)).toBeLessThan(2)
      expect(Math.abs(opened.top - 80)).toBeLessThan(2)
      await page.keyboard.press('End')
      await page.keyboard.press('Enter')
      expect(await menu(page)).toMatchObject({ open: true, ran: [] })
      await page.keyboard.press('ArrowDown')
      expect(await menu(page)).toMatchObject({ active: 'Copy' })
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('Space')
      expect(await menu(page)).toMatchObject({ focused: 'Start', open: false, ran: ['cut'] })
    })
  })

  test('the menu makes the item the pointer rests on active, runs a click, and closes on Escape', async () => {
    await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      await put(page)
      await page.mouse.click(100, 80, { button: 'right' })
      await page.hover('[role=menuitem]:nth-child(2)')
      await page.waitForTimeout(RESTED_MS)
      expect(await menu(page)).toMatchObject({ active: 'Cut' })
      await page.keyboard.press('Escape')
      expect(await menu(page)).toMatchObject({ focused: 'Start', open: false })
      await page.mouse.click(100, 80, { button: 'right' })
      await page.click('[role=menuitem]:nth-child(3)')
      expect(await menu(page)).toMatchObject({ open: false, ran: ['paste'] })
    })
  })
})
