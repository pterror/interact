/** @import { DomMode } from '@interact/dom/css' */
/** @import { Page } from 'playwright-core' */
/** @import { Engine } from '../../../test/browser.js' */

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { BROWSERS, BROWSER_SETUP_MS, audit, startBrowsers, stopBrowsers, withPage } from '../../../test/browser.js'

const STEPS = 8
const PAGE = 30
/** @type {DomMode[]} */
const MODES = ['shadow', 'light']
/** @type {(readonly [DomMode, Engine, boolean])[]} */
const CASES = []
for (const mode of MODES) {
  for (const engine of BROWSERS) {
    for (const windowed of [false, true]) {
      CASES.push([mode, engine, windowed])
    }
  }
}

beforeAll(startBrowsers, BROWSER_SETUP_MS)
afterAll(stopBrowsers, BROWSER_SETUP_MS)

/**
 * Drags with the mouse from one point to another, the button down, noting what the rows show before letting go.
 * @param {Page} page - The page
 * @param {Readonly<{ x: number, y: number }>} from - Where the drag starts
 * @param {Readonly<{ y: number }>} to - Where it goes
 * @param {number} dragged - The position of the row dragged
 * @returns {Promise<Readonly<{ top: number, dragging: boolean }>>} Where the dragged row was drawn, before the drop
 */
async function drag(page, from, to, dragged) {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x, to.y, { steps: STEPS })
  const during = await page.evaluate(async (position) => {
    const pages = await import('./test-page-listbox-extensions.js')
    await pages.settle()
    return pages.drawn(position)
  }, dragged)
  await page.mouse.up()
  return during
}

/**
 * Turns the mouse wheel down `left` more times, letting the listbox render after each.
 * @param {Page} page - The page
 * @param {number} left - Turns still to make
 * @returns {Promise<void>} When they are made
 */
async function wheel(page, left) {
  if (left === 0) {
    return
  }
  await page.mouse.wheel(0, PAGE * PAGE)
  await page.evaluate(async () => {
    const pages = await import('./test-page-listbox-extensions.js')
    await pages.settle()
  })
  await wheel(page, left - 1)
}

/**
 * What the listbox shows, once it has rendered.
 * @param {Page} page - The page
 * @returns {Promise<Readonly<{ order: string, active: string | undefined, focused: boolean, named: boolean }>>} What
 *   shows
 */
async function seen(page) {
  return page.evaluate(async () => {
    const pages = await import('./test-page-listbox-extensions.js')
    await pages.settle()
    return pages.seen()
  })
}

describe.each(CASES)('dragging to reorder a listbox in %s DOM, in %s, windowed: %p', (mode, engine, windowed) => {
  test('shows where a row would land, drops it there, and keeps the active item on its own item, then on the one dragged', async () => {
    /** @type {readonly [DomMode, boolean]} */
    const where = [mode, windowed]
    const found = await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      const rows = await page.evaluate(async ([dom, window]) => {
        const pages = await import('./test-page-listbox-extensions.js')
        return pages.reorderable(dom, window)
      }, where)
      const [first, third, fifth] = [rows[0], rows[2], rows[4]]
      if (first === undefined || third === undefined || fifth === undefined) {
        throw new Error('The rows to drag between are missing')
      }
      const during = await drag(page, first, fifth, 0)
      const across = await seen(page)
      await drag(page, third, first, 2)
      const itself = await seen(page)
      await page.mouse.click(fifth.x, fifth.y)
      const pressed = await seen(page)
      return { across, during, fifthTop: fifth.top, itself, pressed, problems: await audit(page, 'x-listbox') }
    })
    expect(found.during.dragging).toBe(true)
    expect(Math.abs(found.during.top - found.fifthTop)).toBeLessThan(1)
    expect(found.across).toEqual({
      active: 'Item 3',
      focused: true,
      named: true,
      order: '1 2 3 4 0 5 6 7 8 9 10 11',
    })
    expect([found.itself.order, found.itself.active]).toEqual(['3 1 2 4 0 5 6 7 8 9 10 11', 'Item 3'])
    expect([found.pressed.active, found.pressed.focused]).toEqual(['Item 0', true])
    expect(found.problems).toEqual([])
  })
})

describe.each(CASES)('loading a listbox as it scrolls, in %s DOM, in %s, windowed: %p', (mode, engine, windowed) => {
  test('loads more as the wheel nears the end, says so while it does, and keeps the active item and focus', async () => {
    /** @type {readonly [DomMode, boolean]} */
    const where = [mode, windowed]
    const found = await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      const point = await page.evaluate(async ([dom, window]) => {
        const pages = await import('./test-page-listbox-extensions.js')
        return pages.loadable(dom, window)
      }, where)
      await page.mouse.move(point.x, point.y)
      await wheel(page, STEPS)
      const loads = await page.evaluate(async () => {
        const pages = await import('./test-page-listbox-extensions.js')
        return pages.loaded()
      })
      return { loads, problems: await audit(page, 'x-listbox'), shows: await seen(page) }
    })
    expect(found.loads.loads).toBeGreaterThanOrEqual(1)
    expect([found.loads.said[0], found.loads.status]).toEqual(['Loading more…', ''])
    expect(found.shows.order.split(' ').length).toBeGreaterThan(PAGE)
    expect([found.shows.active, found.shows.focused, found.shows.named]).toEqual(['Item 4', true, true])
    expect(found.problems).toEqual([])
  })
})

describe.each(CASES)('grouped sections of a listbox in %s DOM, in %s, windowed: %p', (mode, engine, windowed) => {
  test('are passed over by the keys, and the listbox has no accessibility problems', async () => {
    /** @type {readonly [DomMode, boolean]} */
    const where = [mode, windowed]
    const found = await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      const steps = await page.evaluate(async ([dom, window]) => {
        const pages = await import('./test-page-listbox-extensions.js')
        return pages.grouped(dom, window)
      }, where)
      return { problems: await audit(page, 'x-listbox'), steps }
    })
    expect(found.steps).toEqual(['Fruit 0', 'Vegetable 0', 'Fruit 9', 'Grain 9'])
    expect(found.problems).toEqual([])
  })
})
