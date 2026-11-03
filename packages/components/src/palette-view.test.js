/**
 * @import { DomMode } from '@interact/dom/css'
 * @import { Page } from 'playwright-core'
 * @import { Engine } from '../../../test/browser.js'
 * @import { PaletteSeen } from './test-page-palette.js'
 */

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { renderComponent, stylesheetAttributes, stylesheetText } from '@interact/dom'

import { BROWSERS, BROWSER_SETUP_MS, audit, startBrowsers, stopBrowsers, withPage } from '../../../test/browser.js'
import { paletteView } from './palette-view.js'
import { editorPalette } from './test-palettes.js'

/** @type {readonly DomMode[]} */
const MODES = ['shadow', 'light']
/** @type {(readonly [DomMode, Engine])[]} */
const CASES = []
for (const mode of MODES) {
  for (const engine of BROWSERS) {
    CASES.push([mode, engine])
  }
}
const EVERY = ['*Open file', 'Save', 'Undo', 'Reopen file', 'Zoom in']
/** @type {PaletteSeen['combobox']} */
const COMBOBOX_ON_OPEN = { active: 'Open file', controls: true, expanded: 'true', role: 'combobox' }

beforeAll(startBrowsers, BROWSER_SETUP_MS)
afterAll(stopBrowsers, BROWSER_SETUP_MS)

/**
 * Presses keys one after another.
 * @param {Page} page - The page
 * @param {readonly string[]} pressed - The keys
 * @returns {Promise<void>} When they have been pressed
 */
async function keys(page, pressed) {
  const [key, ...rest] = pressed
  if (key !== undefined) {
    await page.keyboard.press(key)
    await keys(page, rest)
  }
}

/**
 * What the page's palette shows now.
 * @param {Page} page - The page
 * @returns {Promise<PaletteSeen>} What showed
 */
async function look(page) {
  return page.evaluate(async () => {
    const pages = await import('./test-page-palette.js')
    return pages.seen()
  })
}

/**
 * Puts the palette in the page, opens it with Enter on its button, and hands the page to `drive`.
 * @template R
 * @param {Readonly<{ engine: Engine, mode: DomMode }>} where - The browser and the DOM mode
 * @param {(page: Page, opened: PaletteSeen) => Promise<R>} drive - What to do, with what showed on opening
 * @returns {Promise<R>} What it returned
 */
async function withPalette({ engine, mode }, drive) {
  return withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
    await page.evaluate(async (domMode) => {
      const pages = await import('./test-page-palette.js')
      await pages.putPalette(domMode)
    }, mode)
    await keys(page, ['Enter'])
    return drive(page, await look(page))
  })
}

/**
 * The palette as the server renders it, closed, as a page's markup.
 * @param {DomMode} mode - Where it lives
 * @returns {string} The markup
 */
function serverPalette(mode) {
  const view = paletteView()
  const markup = renderComponent(
    view,
    editorPalette(() => undefined),
    { mode, prefix: 'p', styles: 'inline' },
  )
  const styles = `<style ${stylesheetAttributes(['command-palette'])}>${stylesheetText(view, 'light')}</style>`
  return mode === 'light' ? `${styles}${markup}` : markup
}

describe.each(CASES)('a command palette in %s DOM, in %s', (mode, engine) => {
  test('opens with focus in its search field, every command found, the first active as its combobox says', async () => {
    const opened = await withPalette({ engine, mode }, async (_page, seen) => Promise.resolve(seen))
    expect([opened.open, opened.focus, opened.value, opened.results]).toEqual([true, 'search', '', EVERY])
    expect(opened.combobox).toEqual(COMBOBOX_ON_OPEN)
  })

  test('finds commands as the query is typed, marking what matched; the arrows pass what cannot run', async () => {
    const [typed, moved] = await withPalette({ engine, mode }, async (page) => {
      await page.keyboard.type('file')
      const found = await look(page)
      await keys(page, ['Backspace', 'Backspace', 'Backspace', 'Backspace', 'ArrowDown', 'ArrowDown'])
      return [found, await look(page)]
    })
    expect(typed.results).toEqual(['*Open [file]', 'Reopen [file]'])
    expect(moved.results).toEqual(['Open file', 'Save', 'Undo', '*Reopen file', 'Zoom in'])
  })

  test('runs the active command on Enter once it has gone, focus back on its button', async () => {
    const ran = await withPalette({ engine, mode }, async (page) => {
      await keys(page, ['ArrowDown', 'Enter'])
      return look(page)
    })
    expect([ran.open, ran.focus, ran.ran]).toEqual([false, 'opener', ['save with focus on opener']])
  })

  test('runs a command pressed with the pointer', async () => {
    const ran = await withPalette({ engine, mode }, async (page) => {
      await page.getByText('Zoom in').click()
      return look(page)
    })
    expect([ran.open, ran.ran]).toEqual([false, ['zoom with focus on opener']])
  })
})
describe.each(CASES)('a command palette in %s DOM, in %s, closing and shown', (mode, engine) => {
  test('closes on Escape, running nothing, focus back on its button; Tab stays in its search field', async () => {
    const [tabbed, closed] = await withPalette({ engine, mode }, async (page) => {
      await keys(page, ['Tab', 'Shift+Tab'])
      const kept = await look(page)
      await keys(page, ['Escape'])
      return [kept, await look(page)]
    })
    expect([tabbed.open, tabbed.focus]).toEqual([true, 'search'])
    expect([closed.open, closed.focus, closed.ran]).toEqual([false, 'opener', []])
  })

  test('keeps its height whatever is found, saying when nothing is', async () => {
    const [opened, nothing] = await withPalette({ engine, mode }, async (page, seen) => {
      await page.keyboard.type('zzz')
      return [seen, await look(page)]
    })
    expect([nothing.results, nothing.status, nothing.height]).toEqual([[], 'No matching commands', opened.height])
  })

  test('has nothing an accessibility checker finds, open', async () => {
    const problems = await withPalette({ engine, mode }, async (page) => {
      await page.keyboard.type('o')
      return audit(page, 'body')
    })
    expect(problems).toEqual([])
  })
})

describe.each(CASES)('a command palette in %s DOM, in %s, from the server', (mode, engine) => {
  test('adopts the server markup, keeping its search field, and opens from its button', async () => {
    const { adopted, opened } = await withPage(
      { body: serverPalette(mode), engine, moduleUrl: import.meta.url },
      async (page) => {
        const before = await page.evaluate(async () => {
          const pages = await import('./test-page-palette.js')
          const seen = await pages.adoptPalette()
          pages.addOpener()
          return seen
        })
        await keys(page, ['Enter'])
        return { adopted: before, opened: await look(page) }
      },
    )
    expect([adopted.same, adopted.open, opened.open, opened.focus, opened.results]).toEqual([
      true,
      false,
      true,
      'search',
      EVERY,
    ])
  })
})
