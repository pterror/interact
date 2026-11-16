/**
 * The core's components in every browser, by real input: the select (keys, typeahead, a press dragged to an option,
 * its list a popover in the top layer against its trigger, flipped where it doesn't fit), the dialog (focus, the page
 * inert and still, Escape and a press outside), the menu, and the custom elements (a label, parts and states styled
 * from outside the shadow root, a form's field), each passing axe.
 * @import { Page } from 'playwright-core'
 */

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { BROWSERS, BROWSER_SETUP_MS, audit, startBrowsers, stopBrowsers, withPage } from './browser.js'

/** Long enough for a frame to be drawn and a source to answer, in ms */
const FRAME_MS = 50

beforeAll(startBrowsers, BROWSER_SETUP_MS)
afterAll(stopBrowsers, BROWSER_SETUP_MS)

/**
 * What the page shows, after a frame
 * @param {Page} page - The page
 * @returns {Promise<ReturnType<typeof import('./page-components.js').seen>>} It
 */
async function seen(page) {
  await page.waitForTimeout(FRAME_MS)
  return page.evaluate(async () => {
    const components = await import('./page-components.js')
    return components.seen()
  })
}

describe.each(BROWSERS)('the components, in %s', (engine) => {
  test('the select: keys open it on its first option in a popover below its trigger, typeahead finds, Enter chooses', async () => {
    await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      await page.evaluate(async () => {
        const components = await import('./page-components.js')
        components.drawSelect(100)
      })
      await page.keyboard.press('Tab')
      await page.keyboard.press('ArrowDown')
      let now = await seen(page)
      expect([now.focused, now.open]).toEqual(['s-trigger', ['s-popover']])
      const trigger = now.boxes['s-trigger']
      const list = now.boxes['s-popover']
      expect([list?.left, list?.top]).toEqual([trigger?.left, trigger?.bottom])
      expect(await page.locator('#s-trigger').getAttribute('aria-activedescendant')).toBe('s-list-option-Apple')
      expect(await audit(page, '#s-root')).toEqual([])
      await page.keyboard.type('ch')
      await page.waitForTimeout(FRAME_MS)
      expect(await page.locator('#s-trigger').getAttribute('aria-activedescendant')).toBe('s-list-option-Cherry')
      await page.keyboard.press('Enter')
      now = await seen(page)
      expect([now.told, now.open, now.focused]).toEqual([['select "Cherry"'], [], 's-trigger'])
      expect(await page.locator('#s-trigger').textContent()).toBe('Cherry')
    })
  })

  test('the select: a mouse press opens it, and releasing over an option chooses it', async () => {
    await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      await page.evaluate(async () => {
        const components = await import('./page-components.js')
        components.drawSelect(100)
      })
      const trigger = await page.locator('#s-trigger').boundingBox()
      await page.mouse.move((trigger?.x ?? 0) + 5, (trigger?.y ?? 0) + 5)
      await page.mouse.down()
      await page.waitForTimeout(FRAME_MS)
      const banana = await page.locator('#s-list-option-Banana').boundingBox()
      await page.mouse.move((banana?.x ?? 0) + 5, (banana?.y ?? 0) + 5, { steps: 4 })
      expect(await page.locator('#s-trigger').getAttribute('aria-activedescendant')).toBe('s-list-option-Banana')
      await page.mouse.up()
      const now = await seen(page)
      expect([now.told, now.open, now.focused]).toEqual([['select "Banana"'], [], 's-trigger'])
    })
  })

  test("the select: its list flips above its trigger where it doesn't fit below", async () => {
    await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      const height = await page.evaluate(() => document.documentElement.clientHeight)
      await page.evaluate(async (top) => {
        const components = await import('./page-components.js')
        components.drawSelect(top)
      }, height - 40)
      await page.locator('#s-trigger').click()
      const now = await seen(page)
      const trigger = now.boxes['s-trigger']
      const list = now.boxes['s-popover']
      expect([now.open, list?.bottom, list?.left]).toEqual([['s-popover'], trigger?.top, trigger?.left])
    })
  })

  test('the dialog: focus goes in, the page is inert and still, Escape closes it, and focus comes back', async () => {
    await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      await page.evaluate(async () => {
        const components = await import('./page-components.js')
        components.drawDialog()
      })
      await page.locator('#opener').click()
      let now = await seen(page)
      expect([now.focused, now.open, now.overflow]).toEqual(['d-content-trigger', ['d-root'], 'hidden'])
      expect(['opener', 'page'].every((id) => now.inert.includes(id))).toBe(true)
      expect(await audit(page, '#d-root')).toEqual([])
      await page.keyboard.press('Tab')
      now = await seen(page)
      expect(now.focused).toBe('d-close')
      await page.keyboard.press('Shift+Tab')
      await page.keyboard.press('Escape')
      now = await seen(page)
      expect([now.told, now.open, now.focused, now.inert, now.overflow]).toEqual([
        ['dialog false'],
        [],
        'opener',
        [],
        '',
      ])
    })
  })

  test('the dialog: a press inside leaves it open, one outside closes it, and the page under never takes it', async () => {
    await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      await page.evaluate(async () => {
        const components = await import('./page-components.js')
        components.drawDialog()
      })
      await page.locator('#opener').click()
      await page.waitForTimeout(FRAME_MS)
      await page.locator('#d-title').click()
      const inside = await seen(page)
      expect(inside.told).toEqual([])
      await page.mouse.click(4, 4)
      const now = await seen(page)
      expect([now.told, now.open, now.focused]).toEqual([['dialog false'], [], 'opener'])
    })
  })

  test('the menu: its button opens it in a popover below, keys and typeahead move focus, Enter activates', async () => {
    await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      await page.evaluate(async () => {
        const components = await import('./page-components.js')
        components.drawMenu()
      })
      await page.waitForTimeout(FRAME_MS)
      await page.locator('#m-button').focus()
      await page.keyboard.press('Enter')
      let now = await seen(page)
      expect([now.focused, now.open, now.boxes['m-menu']?.top]).toEqual([
        'm-item-cut',
        ['m-menu'],
        now.boxes['m-button']?.bottom,
      ])
      expect(await audit(page, '#m-root')).toEqual([])
      await page.keyboard.press('p')
      await page.keyboard.press('i')
      now = await seen(page)
      expect(now.focused).toBe('m-item-pin')
      await page.keyboard.press('Enter')
      now = await seen(page)
      expect([now.told, now.open, now.focused]).toEqual([['activate "pin"'], [], 'm-button'])
    })
  })

  test('the custom select: labelled by its <label>, styled by its parts and states, a field of its form', async () => {
    await withPage({ engine, moduleUrl: import.meta.url }, async (page) => {
      await page.evaluate(async () => {
        const components = await import('./page-components.js')
        components.drawElements()
      })
      await page.waitForTimeout(FRAME_MS)
      /**
       * The custom select as its form, label, parts and states show it
       * @returns {Promise<ReturnType<typeof import('./page-components.js').elementSeen>>} It
       */
      const element = async () => {
        await page.waitForTimeout(FRAME_MS)
        return page.evaluate(async () => {
          const components = await import('./page-components.js')
          return components.elementSeen()
        })
      }
      let now = await element()
      expect([now.labelled, now.outline, now.expanded, now.data]).toEqual([
        ['Favourite fruit'],
        'rgb(1, 2, 3)',
        false,
        null,
      ])
      await page.locator('#label').click()
      const labelled = await seen(page)
      expect(labelled.focused).toMatch(/-trigger$/u)
      await page.keyboard.press('ArrowDown')
      now = await element()
      expect([now.expanded, now.color]).toEqual([true, 'rgb(4, 5, 6)'])
      expect(await audit(page, 'form')).toEqual([])
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('Enter')
      now = await element()
      expect([now.expanded, now.data]).toEqual([false, 'banana'])
      await page.evaluate(async () => {
        const components = await import('./page-components.js')
        components.resetForm()
      })
      now = await element()
      expect(now.data).toBe(null)
    })
  })
})
