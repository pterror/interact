/**
 * The keybinds library running on `@interact/components`: a CommandHub's keys open the palette, which searches and ranks through
 * the hub as a command system and runs what is chosen; its edit menu and a command button follow the hub's context
 * as it changes; keys bound in the page don't fire inside an open menu. In every browser, both DOM modes.
 * @import { DomMode } from '@interact/dom/css'
 * @import { Page } from 'playwright-core'
 * @import { Engine } from './browser.js'
 * @import { KeybindsSeen } from './seen-keybinds.js'
 */

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { BROWSERS, BROWSER_SETUP_MS, audit, startBrowsers, stopBrowsers, withPage } from './browser.js'

/** @type {readonly DomMode[]} */
const MODES = ['shadow', 'light']
/** @type {(readonly [DomMode, Engine])[]} */
const CASES = []
for (const mode of MODES) {
  for (const engine of BROWSERS) {
    CASES.push([mode, engine])
  }
}

beforeAll(startBrowsers, BROWSER_SETUP_MS)
afterAll(stopBrowsers, BROWSER_SETUP_MS)

/**
 * What the page shows now.
 * @param {Page} page - The page
 * @returns {Promise<KeybindsSeen>} What shows
 */
async function look(page) {
  return page.evaluate(async () => {
    const seen = await import('./seen-keybinds.js')
    return seen.seenPage()
  })
}

/**
 * Makes the page in a DOM mode, with focus in the area the context menu is over, and hands it to `drive`.
 * @template R
 * @param {Readonly<{ engine: Engine, mode: DomMode }>} where - The browser and the DOM mode
 * @param {(page: Page) => Promise<R>} drive - What to do
 * @returns {Promise<R>} What it returned
 */
async function withKeybinds({ engine, mode }, drive) {
  return withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
    await page.evaluate(async (domMode) => {
      const pages = await import('./page-keybinds.js')
      await pages.putPage(domMode)
      pages.focusArea()
    }, mode)
    return drive(page)
  })
}

/**
 * Selects something in the page, so Cut applies.
 * @param {Page} page - The page
 * @returns {Promise<void>} When what follows the hub has heard
 */
async function select(page) {
  await page.evaluate(async () => {
    const pages = await import('./page-keybinds.js')
    await pages.select()
  })
}

/**
 * Labels without the marks of what matched.
 * @param {readonly string[]} labels - The labels
 * @returns {string[]} Them, plain
 */
function plain(labels) {
  return labels.map((label) => label.replaceAll(/[[\]]/gu, ''))
}

describe.each(CASES)('keybinds on @interact/components in %s DOM, in %s', (mode, engine) => {
  test("opens the palette on its key, ranks what is typed by keybinds' scorer, and runs the choice", async () => {
    const [opened, typed, ran] = await withKeybinds({ engine, mode }, async (page) => {
      await page.keyboard.press('Control+k')
      const open = await look(page)
      await page.keyboard.type('file')
      const found = await look(page)
      await page.keyboard.press('Enter')
      return [open, found, await look(page)]
    })
    expect([opened.palette, opened.focus, opened.results]).toEqual([
      true,
      'search',
      ['Reopen file', 'Open file', 'Copy'],
    ])
    expect(plain(typed.results)).toEqual(['Reopen file', 'Open file'])
    expect([ran.palette, ran.focus, ran.ran]).toEqual([false, 'area', ['reopen']])
  })

  test("fills the edit menu, follows the hub's context while open, keeps the page's keys out, and runs the choice", async () => {
    const [opened, copied, selected, ran] = await withKeybinds({ engine, mode }, async (page) => {
      await page.click('#area', { button: 'right' })
      const open = await look(page)
      await page.keyboard.press('Control+c')
      const afterCopyKey = await look(page)
      await select(page)
      const live = await look(page)
      await page.keyboard.press('Home')
      await page.keyboard.press('Enter')
      return [open, afterCopyKey, live, await look(page)]
    })
    expect([opened.menu, opened.entries]).toEqual([true, ['-Cut', 'Copy']])
    expect([copied.menu, copied.ran]).toEqual([true, []])
    expect(selected.entries).toEqual(['Cut', 'Copy'])
    expect([ran.menu, ran.ran]).toEqual([false, ['cut']])
  })
})

describe.each(CASES)('keybinds buttons and checks on @interact/components in %s DOM, in %s', (mode, engine) => {
  test("keeps a command button in step with the hub's context, and runs its command", async () => {
    const [before, after, ran] = await withKeybinds({ engine, mode }, async (page) => {
      const disabled = await look(page)
      await select(page)
      const enabled = await look(page)
      await page.click('#cut-button')
      return [disabled, enabled, await look(page)]
    })
    expect([before.cutDisabled, after.cutDisabled, ran.ran]).toEqual([true, false, ['cut']])
  })

  test('has nothing an accessibility checker finds with the palette or the menu open', async () => {
    const problems = await withKeybinds({ engine, mode }, async (page) => {
      await page.keyboard.press('Control+k')
      await look(page)
      const palette = await audit(page, 'body')
      await page.keyboard.press('Escape')
      await page.click('#area', { button: 'right' })
      await look(page)
      return [...palette, ...(await audit(page, 'body'))]
    })
    expect(problems).toEqual([])
  })
})
