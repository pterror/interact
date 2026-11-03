/**
 * @import { DomMode } from '@interact/dom/css'
 * @import { Page } from 'playwright-core'
 * @import { Engine } from '../../../test/browser.js'
 * @import { MenuSeen } from './test-page-menu.js'
 */

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { renderComponent, stylesheetAttributes, stylesheetText } from '@interact/dom'

import { BROWSERS, BROWSER_SETUP_MS, audit, startBrowsers, stopBrowsers, withPage } from '../../../test/browser.js'
import { menuButtonView } from './menu-view.js'
import { besideMenu, boxAt, crossToSubmenu, keys, look, strayFromSubmenu } from './test-menu-driver.js'
import { editMenu } from './test-menus.js'

const POINT = { x: 350, y: 250 }
const ROOT = 'edit-menu'
const SUBMENU = 'edit-5-menu'
const FIRST = 0
const TO_SHARE = ['ArrowDown', 'End', 'ArrowUp', 'ArrowUp']
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
 * Where a menu test runs: the browser, the DOM mode, and the kind of menu.
 * @typedef {Readonly<{ engine: Engine, mode: DomMode, kind: 'button' | 'context' }>} Where
 */

/**
 * Where a menu button test runs.
 * @param {DomMode} mode - Where it lives
 * @param {Engine} engine - The browser
 * @returns {Where} Where
 */
function button(mode, engine) {
  return { engine, kind: 'button', mode }
}

/**
 * Puts a menu in the page and hands the page to `drive`.
 * @template R
 * @param {Where} where - Where it runs
 * @param {(page: Page) => Promise<R>} drive - What to do
 * @returns {Promise<R>} What it returned
 */
async function withMenu({ engine, kind, mode }, drive) {
  /** @type {Readonly<{ kind: 'button' | 'context', mode: DomMode }>} */
  const put = { kind, mode }
  return withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
    await page.evaluate(async (placed) => {
      const pages = await import('./test-page-menu.js')
      await pages.putMenu(placed.kind, placed.mode)
    }, put)
    return drive(page)
  })
}

/**
 * The menu button as the server renders it, closed, as a page's markup.
 * @param {DomMode} mode - Where it lives
 * @returns {string} The markup
 */
function serverMenu(mode) {
  const view = menuButtonView()
  const markup = renderComponent(view, editMenu(), { mode, prefix: 'm', styles: 'inline' })
  const styles = `<style ${stylesheetAttributes(['menu-button'])}>${stylesheetText(view, 'light')}</style>`
  return mode === 'light' ? `${styles}${markup}` : markup
}

/**
 * Adopts the server's menu button, then opens it from the keyboard.
 * @param {Engine} engine - The browser
 * @param {DomMode} mode - Where it lives
 * @returns {Promise<Readonly<{ adopted: MenuSeen & Readonly<{ same: boolean }>, opened: MenuSeen }>>} What showed
 */
async function adoptAndOpen(engine, mode) {
  return withPage({ body: serverMenu(mode), engine, moduleUrl: import.meta.url }, async (page) => {
    const adopted = await page.evaluate(async () => {
      const pages = await import('./test-page-menu.js')
      const seen = await pages.adoptMenu()
      pages.focusButton()
      return seen
    })
    await keys(page, ['ArrowDown'])
    return { adopted, opened: await look(page) }
  })
}

describe.each(CASES)('a menu button in %s DOM, in %s, from the keyboard', (mode, engine) => {
  test('opens from Down on its first item, steps over separators, and Escape gives focus back', async () => {
    const [opened, moved, closed] = await withMenu(button(mode, engine), async (page) => {
      await keys(page, ['ArrowDown'])
      const first = await look(page)
      await keys(page, ['ArrowDown', 'ArrowDown', 'ArrowDown'])
      const second = await look(page)
      await keys(page, ['Escape'])
      return [first, second, await look(page)]
    })
    expect([opened.open, opened.focus, opened.active, opened.expanded]).toEqual([[true], ROOT, 'Cut', 'true'])
    expect(moved.active).toBe('Wrap lines')
    expect([closed.open, closed.focus, closed.expanded]).toEqual([[false], 'button', 'false'])
  })

  test('opens from Up on its last item; typing finds an item, and Enter runs it and closes', async () => {
    const [opened, typed, ran] = await withMenu(button(mode, engine), async (page) => {
      await keys(page, ['ArrowUp'])
      const first = await look(page)
      await keys(page, ['p'])
      const second = await look(page)
      await keys(page, ['Home', 'Enter'])
      return [first, second, await look(page)]
    })
    expect([opened.active, typed.active]).toEqual(['Large', 'Paste'])
    expect([ran.chosen, ran.open, ran.focus]).toEqual([['cut'], [false], 'button'])
  })

  test('reports a checkbox item on Space and stays open', async () => {
    const seen = await withMenu(button(mode, engine), async (page) => {
      await keys(page, ['ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', ' '])
      return look(page)
    })
    expect([seen.chosen, seen.open, seen.active]).toEqual([['wrap'], [true], 'Wrap lines'])
  })
})

describe.each(CASES)('a submenu in %s DOM, in %s, from the keyboard', (mode, engine) => {
  test('opens beside its entry from the arrow; Escape or the arrow back closes only it; Tab closes all', async () => {
    const [opened, escaped, back, tabbed] = await withMenu(button(mode, engine), async (page) => {
      await keys(page, [...TO_SHARE, 'ArrowRight'])
      const first = await look(page)
      await keys(page, ['Escape'])
      const second = await look(page)
      await keys(page, ['ArrowRight', 'ArrowLeft'])
      const third = await look(page)
      await keys(page, ['ArrowRight', 'Tab'])
      return [first, second, third, await look(page)]
    })
    expect([opened.open, opened.focus, opened.active, besideMenu(opened)]).toEqual([
      [true, true],
      SUBMENU,
      'Mail',
      true,
    ])
    expect([escaped.open, escaped.focus, escaped.active]).toEqual([[true], ROOT, 'Share'])
    expect([back.open, back.focus, back.active]).toEqual([[true], ROOT, 'Share'])
    expect([tabbed.open, tabbed.focus]).toEqual([[false], 'after'])
  })

  test('has nothing an accessibility checker finds, open with its menu', async () => {
    const problems = await withMenu(button(mode, engine), async (page) => {
      await keys(page, [...TO_SHARE, 'ArrowRight'])
      await look(page)
      return audit(page, 'm-menu-button')
    })
    expect(problems).toEqual([])
  })
})

describe.each(CASES)('a submenu in %s DOM, in %s, with the pointer', (mode, engine) => {
  test('opens once the pointer rests on its entry, stays open as it crosses there, and runs what is pressed', async () => {
    const [rested, crossed, ran] = await withMenu(button(mode, engine), crossToSubmenu)
    expect([rested?.open, crossed?.open, crossed?.focus]).toEqual([[true, true], [true, true], SUBMENU])
    expect([ran?.chosen, ran?.open, ran?.focus]).toEqual([['link'], [false], 'button'])
  })

  test('closes once the pointer strays from the way there', async () => {
    const seen = await withMenu(button(mode, engine), strayFromSubmenu)
    expect([seen.open, seen.active]).toEqual([[true], 'Large'])
  })
})

describe.each(CASES)('a menu button in %s DOM, in %s, from the server', (mode, engine) => {
  test('adopts the server markup, keeping its button, and opens from it', async () => {
    const { adopted, opened } = await adoptAndOpen(engine, mode)
    expect([adopted.same, adopted.open, opened.open, opened.active]).toEqual([true, [false], [true], 'Cut'])
  })
})

describe.each(CASES)('a context menu in %s DOM, in %s', (mode, engine) => {
  test('opens where it was asked for with focus on its first item, and Escape gives focus back', async () => {
    const [opened, closed] = await withMenu({ engine, kind: 'context', mode }, async (page) => {
      await page.mouse.click(POINT.x, POINT.y, { button: 'right' })
      const first = await look(page)
      await keys(page, ['Escape'])
      return [first, await look(page)]
    })
    const box = boxAt(opened, FIRST)
    expect([opened.open, opened.focus, opened.active]).toEqual([[true], ROOT, 'Cut'])
    expect([Math.round(box.x), Math.round(box.y)]).toEqual([POINT.x, POINT.y])
    expect([closed.open, closed.focus]).toEqual([[false], 'target'])
  })
})

/** Where the box a context menu opens over has the start of its bottom edge. */
const BOX_BOTTOM_START = { x: 300, y: 300 }

/**
 * Where the context menu's first item is once it has opened.
 * @param {Awaited<ReturnType<typeof look>>} seen - What was seen
 * @returns {number[]} Its x and y, rounded
 */
function firstAt(seen) {
  const box = boxAt(seen, FIRST)
  return [Math.round(box.x), Math.round(box.y)]
}

describe.each(CASES)('a context menu in %s DOM, in %s, asked for from the keyboard', (mode, engine) => {
  test('opens below what has focus, whatever point the engine reports', async () => {
    const opened = await withMenu({ engine, kind: 'context', mode }, async (page) => {
      await page.evaluate(async () => {
        const pages = await import('./test-page-menu.js')
        pages.askFromKeyboard()
      })
      return look(page)
    })
    expect([opened.open, opened.focus, opened.active]).toEqual([[true], ROOT, 'Cut'])
    expect(firstAt(opened)).toEqual([BOX_BOTTOM_START.x, BOX_BOTTOM_START.y])
  })
})

/* Only Chrome fires contextmenu for these keys headless; Firefox and WebKit fire nothing for them there. */
describe.each(MODES)('a context menu in %s DOM, in chrome, from the Context Menu key and Shift+F10', (mode) => {
  test.each(['ContextMenu', 'Shift+F10'])('opens below what has focus on %s', async (key) => {
    const opened = await withMenu({ engine: 'chrome', kind: 'context', mode }, async (page) => {
      await page.focus('#target')
      await keys(page, [key])
      return look(page)
    })
    expect([opened.open, opened.focus]).toEqual([[true], ROOT])
    expect(firstAt(opened)).toEqual([BOX_BOTTOM_START.x, BOX_BOTTOM_START.y])
  })
})
