/**
 * A plain listbox built from `@pterror/interact-list` in every browser: moved through by keys, picked by Enter, Space and
 * clicks, and told to a screen reader by its attributes.
 * @import { Page } from 'playwright-core'
 * @import { ListboxSeen } from './page-listbox.js'
 */

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { BROWSERS, BROWSER_SETUP_MS, audit, startBrowsers, stopBrowsers, withPage } from './browser.js'

beforeAll(startBrowsers, BROWSER_SETUP_MS)
afterAll(stopBrowsers, BROWSER_SETUP_MS)

/**
 * What the listbox shows now
 * @param {Page} page - The page
 * @returns {Promise<ListboxSeen>} What shows
 */
async function look(page) {
  return page.evaluate(async () => {
    const listbox = await import('./page-listbox.js')
    return listbox.seenListbox()
  })
}

describe.each(BROWSERS)('a plain listbox, in %s', (engine) => {
  test('moves by keys, chooses by Enter, Space and clicks, and tells a screen reader both', async () => {
    await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      await page.evaluate(async () => {
        const listbox = await import('./page-listbox.js')
        listbox.putListbox()
      })
      await page.focus('[role=listbox]')
      expect(await look(page)).toEqual({ active: undefined, focused: true, groups: [], options: 8, selected: [] })
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowDown')
      expect(await look(page)).toMatchObject({ active: 'Banana', selected: [] })
      await page.keyboard.press('Space')
      expect(await look(page)).toMatchObject({ active: 'Banana', selected: ['Banana'] })
      await page.keyboard.press('End')
      await page.keyboard.press('Enter')
      expect(await look(page)).toMatchObject({ active: 'Honeydew', selected: ['Honeydew'] })
      expect(await page.isVisible('#fruit-Honeydew')).toBe(true)
      await page.keyboard.press('Home')
      await page.keyboard.press('ArrowUp')
      expect(await look(page)).toMatchObject({ active: 'Apple' })
      await page.click('#fruit-Cherry')
      expect(await look(page)).toEqual({
        active: 'Cherry',
        focused: true,
        groups: [],
        options: 8,
        selected: ['Cherry'],
      })
      expect(await audit(page, '[role=listbox]')).toEqual([])
    })
  })

  test('makes the next item active when the active one is removed, and leaves nothing selected', async () => {
    await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      await page.evaluate(async () => {
        const listbox = await import('./page-listbox.js')
        listbox.putListbox()
      })
      await page.click('#fruit-Date')
      await page.evaluate(async () => {
        const listbox = await import('./page-listbox.js')
        listbox.removeItem('Date')
      })
      expect(await look(page)).toMatchObject({ active: 'Elderberry', options: 7, selected: [] })
    })
  })

  test('grouped by kind: labels each group, steps over the headers, and picks across groups', async () => {
    await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      await page.evaluate(async () => {
        const listbox = await import('./page-listbox.js')
        listbox.putListbox({ grouped: true })
      })
      await page.focus('[role=listbox]')
      expect(await look(page)).toMatchObject({
        groups: ['Tree', 'Palm', 'Shrub', 'Vine'],
        options: 8,
      })
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('Space')
      expect(await look(page)).toMatchObject({ active: 'Date', selected: ['Date'] })
      await page.click('#fruit-Grape')
      await page.keyboard.press('ArrowDown')
      expect(await look(page)).toMatchObject({ active: 'Honeydew', selected: ['Grape'] })
      expect(await audit(page, '[role=listbox]')).toEqual([])
    })
  })
})
