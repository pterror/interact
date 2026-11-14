/**
 * An editor's tooltips in every browser: suggestions, a hover tooltip and a tooltip the page adds itself are each drawn
 * in the editor's open popover, inside the editor in the DOM, placed at what they are shown for, and on top of a box
 * that clips the editor and of an element painted over it; the popover closes when no tooltip is left.
 * @import { Page } from 'playwright-core'
 * @import { TooltipSeen } from './page-editor-tooltips.js'
 */

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { BROWSERS, BROWSER_SETUP_MS, startBrowsers, stopBrowsers, withPage } from './browser.js'

/** Longer than CodeMirror's hover delay and its measuring */
const SETTLE_MS = 400
/** How far from what it is shown for a tooltip may start, in CSS pixels */
const NEAR_PX = 8

beforeAll(startBrowsers, BROWSER_SETUP_MS)
afterAll(stopBrowsers, BROWSER_SETUP_MS)

/**
 * The tooltips shown, once placed
 * @param {Page} page - The page
 * @returns {Promise<TooltipSeen[]>} Each
 */
async function look(page) {
  await page.waitForTimeout(SETTLE_MS)
  return page.evaluate(async () => {
    const tooltips = await import('./page-editor-tooltips.js')
    return tooltips.seenTooltips()
  })
}

/**
 * Whether a tooltip is shown as the top layer shows it, where it belongs
 * @param {TooltipSeen} seen - The tooltip
 * @returns {boolean} Whether it is in an open popover in the editor, on top and starting near what it is shown for
 */
function inTopLayerAtAnchor(seen) {
  return seen.open && seen.inEditor && seen.onTop && Math.abs(seen.below) <= NEAR_PX && Math.abs(seen.across) <= NEAR_PX
}

describe.each(BROWSERS)('an editor’s tooltips, in %s', (engine) => {
  test('are in a popover, placed at what they are shown for, over what clips or covers the editor', async () => {
    await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      await page.evaluate(async () => {
        const tooltips = await import('./page-editor-tooltips.js')
        tooltips.putEditor()
        tooltips.suggest()
      })
      const suggested = await look(page)
      expect(suggested.map((seen) => seen.kind)).toEqual(['suggestions'])
      expect(suggested.filter((seen) => !inTopLayerAtAnchor(seen))).toEqual([])

      await page.keyboard.press('Escape')
      await page.evaluate(async () => {
        const tooltips = await import('./page-editor-tooltips.js')
        tooltips.pinAtStart(true)
      })
      const pinned = await look(page)
      expect(pinned.map((seen) => seen.kind)).toEqual(['pinned'])
      expect(pinned.filter((seen) => !inTopLayerAtAnchor(seen))).toEqual([])

      const word = await page.evaluate(async () => {
        const tooltips = await import('./page-editor-tooltips.js')
        tooltips.pinAtStart(false)
        return tooltips.firstWord()
      })
      await page.mouse.move(word.x, word.y)
      const hovered = await look(page)
      expect(hovered.map((seen) => seen.kind)).toEqual(['hover'])
      expect(hovered.filter((seen) => !inTopLayerAtAnchor(seen))).toEqual([])
    })
  })

  test('closes the popover when no tooltip is left', async () => {
    await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      await page.evaluate(async () => {
        const tooltips = await import('./page-editor-tooltips.js')
        tooltips.putEditor()
        tooltips.pinAtStart(true)
      })
      const shown = await look(page)
      expect(shown.map((seen) => seen.open)).toEqual([true])
      expect(
        await page.evaluate(() => {
          const open = document.querySelector(':popover-open')
          return open !== null && open.parentElement?.classList.contains('cm-editor') === true
        }),
      ).toBe(true)
      await page.evaluate(async () => {
        const tooltips = await import('./page-editor-tooltips.js')
        tooltips.pinAtStart(false)
      })
      expect(await look(page)).toEqual([])
      expect(await page.evaluate(() => document.querySelectorAll(':popover-open').length)).toBe(0)
    })
  })
})
