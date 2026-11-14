/**
 * A chat counted from the bottom, in every browser: a new message shows at the bottom while the view is there, and
 * arrives below the view, leaving what is on screen in place, once the view is scrolled up.
 * @import { Page } from 'playwright-core'
 * @import { ChatSeen } from './page-chat.js'
 */

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { BROWSERS, BROWSER_SETUP_MS, startBrowsers, stopBrowsers, withPage } from './browser.js'

/** How long scrolling and drawing get to settle */
const SETTLE_MS = 100

beforeAll(startBrowsers, BROWSER_SETUP_MS)
afterAll(stopBrowsers, BROWSER_SETUP_MS)

/**
 * What the chat shows once it has settled
 * @param {Page} page - The page
 * @returns {Promise<ChatSeen>} What shows
 */
async function look(page) {
  await page.waitForTimeout(SETTLE_MS)
  return page.evaluate(async () => {
    const chat = await import('./page-chat.js')
    return chat.seenChat()
  })
}

/**
 * Says a new message
 * @param {Page} page - The page
 * @returns {Promise<void>} When it is said
 */
async function say(page) {
  await page.evaluate(async () => {
    const chat = await import('./page-chat.js')
    chat.say()
  })
}

describe.each(BROWSERS)('a chat, in %s', (engine) => {
  test('keeps the view at the bottom while it is there, and in place once it is scrolled up', async () => {
    await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      await page.evaluate(async () => {
        const chat = await import('./page-chat.js')
        chat.putChat()
      })
      expect(await look(page)).toEqual({ atBottom: true, fromBottom: 0, lowest: 'm49' })
      await say(page)
      expect(await look(page)).toEqual({ atBottom: true, fromBottom: 0, lowest: 'm50' })
      await say(page)
      await say(page)
      expect(await look(page)).toEqual({ atBottom: true, fromBottom: 0, lowest: 'm52' })
      await page.evaluate(async () => {
        const chat = await import('./page-chat.js')
        chat.scrollUp(48)
      })
      expect(await look(page)).toEqual({ atBottom: false, fromBottom: 48, lowest: 'm50' })
      await say(page)
      expect(await look(page)).toEqual({ atBottom: false, fromBottom: 72, lowest: 'm50' })
      await page.evaluate(async () => {
        const chat = await import('./page-chat.js')
        chat.scrollUp(-1000)
      })
      const back = await look(page)
      expect(back.lowest).toBe('m53')
      await say(page)
      expect(await look(page)).toEqual({ atBottom: true, fromBottom: 0, lowest: 'm54' })
    })
  })
})
