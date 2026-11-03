/**
 * @import { DomMode } from '@interact/dom/css'
 * @import { Page } from 'playwright-core'
 * @import { Engine } from '../../../test/browser.js'
 * @import { ComboboxSeen, Variant } from './test-page-combobox.js'
 */

import { afterAll, describe, expect, test } from 'bun:test'

import { renderComponent, stylesheetAttributes, stylesheetText } from '@interact/dom'

import { BROWSERS, audit, closeBrowser, withPage } from '../../../test/browser.js'
import { comboboxView } from './combobox-view.js'
import { fruitSelect } from './test-comboboxes.js'

/** @type {readonly DomMode[]} */
const MODES = ['shadow', 'light']
/** @type {(readonly [DomMode, Engine])[]} */
const CASES = []
for (const mode of MODES) {
  for (const engine of BROWSERS) {
    CASES.push([mode, engine])
  }
}
const TYPED = 2
const COMPLETED = 9

afterAll(closeBrowser)

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
 * What the page's combobox shows now.
 * @param {Page} page - The page
 * @returns {Promise<ComboboxSeen>} What showed
 */
async function look(page) {
  return page.evaluate(async () => {
    const pages = await import('./test-page-combobox.js')
    return pages.seen()
  })
}

/**
 * Puts a combobox of a kind in the page, focused, and hands the page to `drive`.
 * @template R
 * @param {Readonly<{ engine: Engine, mode: DomMode, variant: Variant }>} where - The browser, the DOM mode, the kind
 * @param {(page: Page) => Promise<R>} drive - What to do
 * @returns {Promise<R>} What it returned
 */
async function withCombobox({ engine, mode, variant }, drive) {
  /** @type {readonly [DomMode, Variant]} */
  const put = [mode, variant]
  return withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
    await page.evaluate(async ([domMode, kind]) => {
      const pages = await import('./test-page-combobox.js')
      await pages.putCombobox(domMode, kind)
    }, put)
    return drive(page)
  })
}

/**
 * The select-only combobox with Banana chosen as the server renders it, closed, as a page's markup.
 * @param {DomMode} mode - Where it lives
 * @returns {string} The markup
 */
function serverCombobox(mode) {
  const view = comboboxView()
  const markup = renderComponent(view, fruitSelect('Banana'), { mode, prefix: 'p', styles: 'inline' })
  const styles = `<style ${stylesheetAttributes(['combobox'])}>${stylesheetText(view, 'light')}</style>`
  return mode === 'light' ? `${styles}${markup}` : markup
}

describe.each(CASES)('a select-only combobox in %s DOM, in %s', (mode, engine) => {
  test('opens on Enter on the first option, moves with the arrows, and chooses with Enter, focus kept in it', async () => {
    const [opened, moved, chosen] = await withCombobox({ engine, mode, variant: 'select' }, async (page) => {
      await keys(page, ['Enter'])
      const open = await look(page)
      await keys(page, ['ArrowDown', 'ArrowDown'])
      const down = await look(page)
      await keys(page, ['Enter'])
      return [open, down, await look(page)]
    })
    expect([opened.open, opened.focus, opened.field]).toEqual([
      true,
      'field',
      { active: 'Apple', autocomplete: undefined, controls: true, expanded: 'true', role: 'combobox' },
    ])
    expect([moved.options, moved.below, moved.wide]).toEqual([['Apple', 'Apricot', '*Banana', 'Blueberry'], true, true])
    expect([chosen.open, chosen.focus, chosen.shows, chosen.field.expanded]).toEqual([
      false,
      'field',
      'Banana',
      'false',
    ])
  })

  test('goes to the option a character starts, and chooses it when Tab leaves', async () => {
    const [typed, left] = await withCombobox({ engine, mode, variant: 'select' }, async (page) => {
      await keys(page, ['c'])
      const found = await look(page)
      await keys(page, ['Tab'])
      return [found, await look(page)]
    })
    expect([typed.open, typed.field.active]).toEqual([true, 'Cherry'])
    expect([left.open, left.focus, left.shows]).toEqual([false, 'after', 'Cherry'])
  })

  test('opens when pressed, and chooses an option pressed, focus staying in its field', async () => {
    const chosen = await withCombobox({ engine, mode, variant: 'select' }, async (page) => {
      await page.locator('[part~="field"]').click()
      await page.getByRole('option', { name: 'Apricot' }).click()
      return look(page)
    })
    expect([chosen.open, chosen.focus, chosen.shows]).toEqual([false, 'field', 'Apricot'])
  })
})

describe.each(CASES)('a select-only combobox in %s DOM, in %s, closing', (mode, engine) => {
  test('closes on Escape keeping what was chosen', async () => {
    const closed = await withCombobox({ engine, mode, variant: 'select-banana' }, async (page) => {
      await keys(page, ['ArrowDown', 'ArrowDown', 'Escape'])
      return look(page)
    })
    expect([closed.open, closed.focus, closed.shows]).toEqual([false, 'field', 'Banana'])
  })

  test('has nothing an accessibility checker finds, closed and open', async () => {
    const problems = await withCombobox({ engine, mode, variant: 'select' }, async (page) => {
      const closed = await audit(page, 'body')
      await keys(page, ['ArrowDown'])
      await look(page)
      return [...closed, ...(await audit(page, 'body'))]
    })
    expect(problems).toEqual([])
  })
})

describe.each(CASES)('an editable combobox in %s DOM, in %s', (mode, engine) => {
  test('suggests by what is typed, Down and Enter choose, and two Escapes close then empty it', async () => {
    const [typed, chosen, emptied] = await withCombobox({ engine, mode, variant: 'list' }, async (page) => {
      await page.keyboard.type('a')
      const found = await look(page)
      await keys(page, ['Backspace', 'b', 'ArrowDown', 'Enter'])
      const choice = await look(page)
      await keys(page, ['Escape', 'Escape'])
      return [found, choice, await look(page)]
    })
    expect([typed.open, typed.options, typed.field.active, typed.field.autocomplete]).toEqual([
      true,
      ['Apple', 'Apricot'],
      undefined,
      'list',
    ])
    expect([chosen.open, chosen.focus, chosen.shows]).toEqual([false, 'field', 'Banana'])
    expect([emptied.open, emptied.shows]).toEqual([false, ''])
  })

  test('completes what is typed inline, the completion selected, and keeps it as Enter chooses', async () => {
    const [typed, chosen] = await withCombobox({ engine, mode, variant: 'both' }, async (page) => {
      await page.keyboard.type('bl')
      const shown = await look(page)
      await keys(page, ['Enter'])
      return [shown, await look(page)]
    })
    expect([typed.shows, typed.selected, typed.field.active]).toEqual(['blueberry', [TYPED, COMPLETED], 'Blueberry'])
    expect([chosen.open, chosen.shows]).toEqual([false, 'Blueberry'])
  })

  test('has nothing an accessibility checker finds, open', async () => {
    const problems = await withCombobox({ engine, mode, variant: 'list' }, async (page) => {
      await page.keyboard.type('a')
      await keys(page, ['ArrowDown'])
      await look(page)
      return audit(page, 'body')
    })
    expect(problems).toEqual([])
  })
})

describe.each(CASES)('a combobox in %s DOM, in %s, over ten billion options and from the server', (mode, engine) => {
  test('opens on the option chosen, five billion in, and goes to the last with End', async () => {
    const [opened, last] = await withCombobox({ engine, mode, variant: 'number' }, async (page) => {
      await keys(page, ['ArrowDown'])
      const open = await look(page)
      await keys(page, ['End'])
      return [open, await look(page)]
    })
    expect([opened.field.active, last.field.active]).toEqual(['Item 5000000000', 'Item 9999999999'])
  })

  test('adopts the server markup, keeping its field, and opens on the option chosen', async () => {
    const { adopted, opened } = await withPage(
      { body: serverCombobox(mode), engine, moduleUrl: import.meta.url },
      async (page) => {
        const before = await page.evaluate(async () => {
          const pages = await import('./test-page-combobox.js')
          return pages.adoptCombobox()
        })
        await keys(page, ['Enter'])
        return { adopted: before, opened: await look(page) }
      },
    )
    expect([adopted.same, adopted.open, adopted.shows]).toEqual([true, false, 'Banana'])
    expect([opened.open, opened.focus, opened.field.active, opened.options]).toEqual([
      true,
      'field',
      'Banana',
      ['Apple', 'Apricot', '*Banana', 'Blueberry'],
    ])
  })
})
