/** @import { DomMode } from '@interact/dom/css' */
/** @import { Page } from 'playwright-core' */
/** @import { Engine } from '../../../test/browser.js' */
/** @import { Seen } from './test-pages.js' */

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { renderComponent, stylesheetAttributes, stylesheetText } from '@interact/dom'

import { BROWSERS, BROWSER_SETUP_MS, audit, startBrowsers, stopBrowsers, withPage } from '../../../test/browser.js'
import { listboxView } from './listbox-view.js'
import { TEN_BILLION, numbers, tenBillionListbox } from './test-helpers.js'
import { MAX_SCROLL_PIXELS, rowCap } from './virtual-rows.js'

const FIVE_BILLION = 5_000_000_000
const START = 0
const ONE = 1
const ROWS = 10
const LAST_ROW = ROWS - ONE
const LIMIT = 16
const OVERSCAN = 5
const PRESSED = 3
const WHEEL = 100
const WHEELS = 20
const ZOOM = 2
const TALL_ROW = 600
const WHITE = 'rgb(255, 255, 255)'
const CLEAR = 'rgba(0, 0, 0, 0)'
const BRAND = 'rgb(47, 95, 208)'
const COMPONENT = 'rgb(1, 2, 3)'
const PART = 'rgb(4, 5, 6)'
const INSTANCE = 'rgb(7, 8, 9)'
/** @type {DomMode[]} */
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
 * The listbox rendered on the server at `top`, as a page body: in shadow DOM with its stylesheet inline, in light DOM
 * with the stylesheet once in the page.
 * @param {DomMode} mode - Where it lives
 * @param {number} top - The position at the top
 * @returns {string} The markup
 */
function serverPage(mode, top) {
  const view = listboxView()
  const listbox = tenBillionListbox(numbers(TEN_BILLION).source, top)
  const markup = renderComponent(view, listbox, { mode, prefix: 'x', styles: 'inline' })
  const styles = `<style ${stylesheetAttributes(['listbox'])}>${stylesheetText(view, 'light')}</style>`
  return mode === 'light' ? `${styles}${markup}` : markup
}

/**
 * Turns the mouse wheel over the viewport `left` more times, noting what shows after each turn has settled.
 * @param {Page} page - The page
 * @param {number} left - Turns still to make
 * @param {readonly Seen[]} noted - What showed after the turns so far
 * @returns {Promise<readonly Seen[]>} What showed after each turn
 */
async function wheel(page, left, noted) {
  if (left === START) {
    return noted
  }
  await page.mouse.wheel(START, WHEEL)
  const now = await page.evaluate(async () => {
    const pages = await import('./test-pages.js')
    await pages.settle()
    return pages.seen()
  })
  return wheel(page, left - ONE, [...noted, now])
}

/**
 * Where a scenario runs: the browser, the listbox's DOM mode, and the page's markup.
 * @typedef {Readonly<{ engine: Engine, mode: DomMode, body?: string }>} Where
 */

/**
 * Puts a listbox in a page with a scenario that leaves it ready to scroll, then turns the wheel over it.
 * @param {Where} where - Where it runs
 * @param {(dom: DomMode) => Promise<Readonly<{ across: number, down: number }>>} scenario - What runs in the page,
 *   giving where to put the mouse
 * @returns {Promise<readonly Seen[]>} What showed after each turn
 */
async function wheeled({ engine, mode }, scenario) {
  return withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
    const point = await page.evaluate(scenario, mode)
    await page.mouse.move(point.across, point.down)
    return wheel(page, WHEELS, [])
  })
}

/**
 * What the wheel did: whether every turn moved the top forward by no more than the rows showing, how far it moved in
 * all, whether the scroll position went back at some point (the offset moving), and where it ended.
 * @param {readonly Seen[]} noted - What showed after each turn
 * @returns {Readonly<{ steady: boolean, moved: number, wentBack: boolean, last: readonly number[] }>} The summary
 */
function summary(noted) {
  const first = noted.at(START)
  const last = noted.at(-ONE)
  return {
    last: [last?.top ?? Number.NaN, last?.bottom ?? Number.NaN],
    moved: (last?.top ?? Number.NaN) - (first?.top ?? Number.NaN),
    steady: noted
      .slice(ONE)
      .map((now, index) => now.top - (noted[index]?.top ?? Number.NaN))
      .every((rows) => rows >= START && rows <= ROWS),
    wentBack: noted.some((now, index) => now.scrollTop < (noted[index - ONE]?.scrollTop ?? Number.NEGATIVE_INFINITY)),
  }
}

/**
 * Runs a page scenario that takes the DOM mode.
 * @template R
 * @param {Where} where - Where it runs
 * @param {(dom: DomMode) => Promise<R>} scenario - What runs in the page
 * @returns {Promise<R>} What it reported
 */
async function inPage({ body = '', engine, mode }, scenario) {
  return withPage({ body, engine, moduleUrl: import.meta.url }, async (page) => page.evaluate(scenario, mode))
}

describe.each(CASES)('the listbox in %s DOM, in %s', (mode, engine) => {
  test('adopts the server markup at five billion: the same nodes, its top item at the top', async () => {
    const seen = await inPage({ body: serverPage(mode, FIVE_BILLION), engine, mode }, async () => {
      const pages = await import('./test-pages.js')
      return pages.adoptServerListbox(pages.FIVE_BILLION)
    })
    expect([seen.same, seen.before]).toEqual([true, ROWS + OVERSCAN + OVERSCAN])
    expect([seen.top, seen.bottom]).toEqual([FIVE_BILLION, FIVE_BILLION + LAST_ROW])
  })

  test('lands exactly on five billion and on the last item, holding a bounded cache however far it jumps', async () => {
    const seen = await inPage({ engine, mode }, async (dom) => {
      const { jump } = await import('./test-pages.js')
      return jump(dom)
    })
    expect([seen.fiveBillion.top, seen.fiveBillion.bottom]).toEqual([FIVE_BILLION, FIVE_BILLION + LAST_ROW])
    expect([seen.last.top, seen.last.bottom]).toEqual([TEN_BILLION - ROWS, TEN_BILLION - ONE])
    expect(seen.mostBlocks).toBeLessThanOrEqual(LIMIT)
    expect(seen.mostOptions).toBeLessThanOrEqual(ROWS + OVERSCAN + OVERSCAN + ONE)
  })

  test('selects all ten billion but one, reading only what shows', async () => {
    const seen = await inPage({ engine, mode }, async (dom) => {
      const { selectAllButOne } = await import('./test-pages.js')
      return selectAllButOne(dom)
    })
    expect(seen.count).toBe(TEN_BILLION - ONE)
    expect(seen.read).toBeLessThanOrEqual(ROWS * ROWS)
  })

  test('keeps focus while the active item is scrolled far away, and brings it back on the next key', async () => {
    const seen = await inPage({ engine, mode }, async (dom) => {
      const { focusAway } = await import('./test-pages.js')
      return focusAway(dom)
    })
    expect([seen.away.focused, seen.away.activeThere, seen.away.active]).toEqual([true, true, PRESSED])
    expect(seen.away.top).toBeGreaterThan(ROWS * ROWS)
    expect([seen.back.focused, seen.back.activeThere, seen.back.active]).toEqual([true, true, PRESSED + ONE])
    expect(seen.back.top).toBe(PRESSED + ONE)
  })
})

describe.each(CASES)('focus entering the listbox in %s DOM, in %s', (mode, engine) => {
  test('goes to the first selected item, far down, and shows it', async () => {
    const seen = await inPage({ engine, mode }, async (dom) => {
      const { focusSelected } = await import('./test-pages.js')
      return focusSelected(dom)
    })
    expect([seen.focused, seen.activeThere, seen.active]).toEqual([true, true, FIVE_BILLION + ONE])
    expect(seen.top).toBeLessThanOrEqual(FIVE_BILLION + ONE)
    expect(seen.bottom).toBeGreaterThanOrEqual(FIVE_BILLION + ONE)
  })
})

describe.each(CASES)('the scrollable rows of the listbox in %s DOM, in %s', (mode, engine) => {
  test("stay under every browser's limit for tall rows at 200% zoom, and still land exactly", async () => {
    const seen = await inPage({ engine, mode }, async (dom) => {
      const { zoomedTallRows } = await import('./test-pages.js')
      return zoomedTallRows(dom)
    })
    expect(seen.scrollable).toBe(rowCap(TALL_ROW * ZOOM))
    expect(seen.scrollHeight).toBeGreaterThan(START)
    expect(seen.scrollHeight * ZOOM).toBeLessThanOrEqual(MAX_SCROLL_PIXELS)
    expect(seen.top).toBe(FIVE_BILLION)
  })

  test('land exactly with rows a fraction of a pixel tall, near the limit', async () => {
    const seen = await inPage({ engine, mode }, async (dom) => {
      const { fractionalRows } = await import('./test-pages.js')
      return fractionalRows(dom)
    })
    expect([seen.last.top, seen.last.bottom]).toEqual([TEN_BILLION - ROWS, TEN_BILLION - ONE])
    expect([seen.fiveBillion.top, seen.fiveBillion.bottom]).toEqual([FIVE_BILLION, FIVE_BILLION + LAST_ROW])
  })
})

describe.each(CASES)('the listbox in %s DOM, in %s, to an accessibility checker', (mode, engine) => {
  test('has no problems as the server renders it, before it is live', async () => {
    const body = serverPage(mode, FIVE_BILLION)
    expect(
      await withPage({ body, engine, moduleUrl: import.meta.url }, async (page) => audit(page, 'x-listbox')),
    ).toEqual([])
  })

  test.each(['', '<link rel="stylesheet" href="/packages/theme/tokens.css">'])(
    'has no problems focused, with an item active and some chosen, with the theme or none (%p)',
    async (body) => {
      const found = await withPage({ body, engine, moduleUrl: import.meta.url }, async (page) => {
        await page.evaluate(async (dom) => {
          const { focusedAndChosen } = await import('./test-pages.js')
          await focusedAndChosen(dom)
        }, mode)
        return audit(page, 'x-listbox')
      })
      expect(found).toEqual([])
    },
  )

  test.each(['', '<link rel="stylesheet" href="/packages/theme/tokens.css">'])(
    'outlines the active option in a color its selected fill does not hide (%p)',
    async (body) => {
      const seen = await withPage({ body, engine, moduleUrl: import.meta.url }, async (page) =>
        page.evaluate(async (dom) => {
          const { activeSelectedOutline } = await import('./test-pages.js')
          return activeSelectedOutline(dom)
        }, mode),
      )
      expect(seen.outline).not.toBe(seen.fill)
      expect(seen.width).toBe('2px')
    },
  )
})

describe.each(CASES)('the listbox in %s DOM, in %s, in forced colors', (mode, engine) => {
  test("shows a selected option in the person's own selection colors", async () => {
    const seen = await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      await page.emulateMedia({ forcedColors: 'active' })
      return page.evaluate(async (dom) => {
        const { selectedFills } = await import('./test-pages.js')
        return selectedFills(dom)
      }, mode)
    })
    expect(seen.selected).toBe(seen.highlight)
    expect(seen.unselected).not.toBe(seen.highlight)
  })
})

describe.each(CASES)('tokens for the listbox in %s DOM, in %s', (mode, engine) => {
  test('resolve on each element: the theme, then component, part, state and instance tokens over it', async () => {
    const theme = '<link rel="stylesheet" href="/packages/theme/tokens.css">'
    const seen = await inPage({ body: theme, engine, mode }, async (dom) => {
      const { tokenLevels } = await import('./test-pages.js')
      return tokenLevels(dom)
    })
    expect(seen.theme).toEqual({ fill: WHITE, option: CLEAR, selected: BRAND })
    expect(seen.component).toEqual({ fill: COMPONENT, option: CLEAR, selected: BRAND })
    expect(seen.part).toEqual({ fill: COMPONENT, option: PART, selected: BRAND })
    expect(seen.instance).toEqual({ fill: COMPONENT, option: PART, selected: INSTANCE })
  })
})

describe.each(CASES)('native scrolling of the listbox in %s DOM, in %s', (mode, engine) => {
  test('crosses a move of the offset without skipping a row or going back', async () => {
    const turns = summary(
      await wheeled({ engine, mode }, async (dom) => {
        const { beforeRecentring } = await import('./test-pages.js')
        return beforeRecentring(dom)
      }),
    )
    expect([turns.steady, turns.wentBack]).toEqual([true, true])
    expect(turns.moved).toBeGreaterThan(ROWS)
  })

  test('reaches the very last item and stops there', async () => {
    const turns = summary(
      await wheeled({ engine, mode }, async (dom) => {
        const { beforeTheEnd } = await import('./test-pages.js')
        return beforeTheEnd(dom)
      }),
    )
    expect(turns.last).toEqual([TEN_BILLION - ROWS, TEN_BILLION - ONE])
  })
})
