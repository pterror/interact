/**
 * @import { Page } from 'playwright-core'
 * @import { LayerOptions } from '@interact/core/layer'
 * @import { Engine } from '../../../test/browser.js'
 * @import { DomMode } from './css.js'
 */

import { afterAll, describe, expect, test } from 'bun:test'

import { BROWSERS, audit, closeBrowser, withPage } from '../../../test/browser.js'
import { renderComponent, stylesheetAttributes, stylesheetText } from './render-component.js'
import {
  adoptServer,
  detachAndReattach,
  dismissals,
  focusAfter,
  focused,
  hearDismissals,
  look,
  open,
  openNow,
  openOverModal,
  pressMiddle,
  put,
  setOpen,
  tryFocusingOutside,
} from './test-overlay-driver.js'
import { Popup, popupView } from './test-overlay.js'

const GAP = 4
const AWAY = { x: 700, y: 500 }
const BACKDROP = { x: 5, y: 5 }
const AT = { x: 100, y: 100 }
/** @type {readonly DomMode[]} */
const MODES = ['shadow', 'light']
/** @type {(readonly [DomMode, Engine])[]} */
const CASES = []
for (const mode of MODES) {
  for (const engine of BROWSERS) {
    CASES.push([mode, engine])
  }
}

afterAll(closeBrowser)

/**
 * Opens a page in a browser with a button after whatever markup it is given, registers the fixtures unless it is to
 * adopt server markup first, and drives it.
 * @template R
 * @param {Readonly<{ engine: Engine, body?: string, options?: LayerOptions, registered?: boolean, after?: boolean }>}
 *   where - The browser, the page's markup before the button, how the fixtures' layers are made, whether to register
 *   them, and whether the button after them is there
 * @param {(page: Page) => Promise<R>} drive - What to do
 * @returns {Promise<R>} What it returned
 */
async function driven({ after = true, body = '', engine, options = {}, registered = true }, drive) {
  const markup = after ? `${body}<button id="after">After</button>` : body
  return withPage({ body: markup, engine, moduleUrl: import.meta.url }, async (page) => {
    if (registered) {
      await page.evaluate(async (layerOptions) => {
        const { setUp } = await import('./test-overlay-page.js')
        setUp(layerOptions)
      }, options)
    }
    return drive(page)
  })
}

/**
 * The popup as the server renders it, closed, as a page's markup.
 * @param {DomMode} mode - Where it lives
 * @returns {string} The markup
 */
function serverPopup(mode) {
  const markup = renderComponent(popupView, new Popup({}), { mode, prefix: 'o', styles: 'inline' })
  const styles = `<style ${stylesheetAttributes(['popup'])}>${stylesheetText(popupView, 'light')}</style>`
  return mode === 'light' ? `${styles}${markup}` : markup
}

describe.each(CASES)('a popup in %s DOM, in %s', (mode, engine) => {
  test('opens below its button in the top layer, focus inside; Escape closes it and gives focus back', async () => {
    const seen = await driven({ engine }, async (page) => {
      await put(page, { at: AT, id: 'a', kind: 'popup', mode })
      const opened = await open(page, 'a')
      const focusOpen = await focused(page)
      await page.keyboard.press('Escape')
      return { closed: await look(page, 'a'), focusClosed: await focused(page), focusOpen, opened }
    })
    const { closed, opened } = seen
    expect([opened.open, opened.shown, opened.onTop, opened.side]).toEqual([true, true, true, 'block-end'])
    expect([opened.overlay.x, opened.overlay.y]).toEqual([
      opened.trigger.x,
      opened.trigger.y + opened.trigger.height + GAP,
    ])
    expect([seen.focusOpen, closed.open, closed.shown, seen.focusClosed]).toEqual([
      'a first',
      false,
      false,
      'a trigger',
    ])
  })

  test('closes on a press outside, and on a press on its own button without opening again', async () => {
    const seen = await driven({ engine }, async (page) => {
      await put(page, { at: AT, id: 'a', kind: 'popup', mode })
      await open(page, 'a')
      await page.mouse.click(AWAY.x, AWAY.y)
      const [outside] = await openNow(page, ['a'])
      const reopened = await open(page, 'a')
      await pressMiddle(page, reopened.trigger)
      const [ownButton] = await openNow(page, ['a'])
      return { outside, ownButton, reopened: reopened.open }
    })
    expect(seen).toEqual({ outside: false, ownButton: false, reopened: true })
  })

  test('closes when Tab takes focus out of it, leaving focus where Tab put it', async () => {
    const seen = await driven({ engine }, async (page) => {
      await put(page, { at: AT, id: 'a', kind: 'popup', mode })
      await open(page, 'a')
      const stops = await focusAfter(page, ['Tab', 'Tab'])
      return { stillOpen: await openNow(page, ['a']), stops }
    })
    expect(seen).toEqual({ stillOpen: [false], stops: ['a second', 'button'] })
  })
})

/*
 * Headless Firefox moves focus nowhere on a Tab past the page's last element (no blur, no focusout), so there focus
 * never leaves the popup. Chrome and WebKit move it out of the document, and closing gives it back to the button, where
 * the person finds it when they come back to the page.
 */
describe.each(CASES)('a popup last in the page in %s DOM, in %s', (mode, engine) => {
  const expected =
    engine === 'firefox' ? { stillOpen: true, stop: 'a second' } : { stillOpen: false, stop: 'a trigger' }

  test('closes when Tab takes focus out of the page, and only then', async () => {
    const seen = await driven({ after: false, engine }, async (page) => {
      await put(page, { at: AT, id: 'a', kind: 'popup', mode })
      await open(page, 'a')
      const [, stop] = await focusAfter(page, ['Tab', 'Tab'])
      const [stillOpen] = await openNow(page, ['a'])
      return { stillOpen, stop }
    })
    expect(seen).toEqual(expected)
  })
})

describe.each(CASES)('popups inside popups in %s DOM, in %s', (mode, engine) => {
  test('a press in the outer one closes only the inner; Escape closes one at a time', async () => {
    const seen = await driven({ engine }, async (page) => {
      await put(page, { at: AT, id: 'outer', kind: 'popup', mode })
      await put(page, { id: 'inner', inside: 'outer', kind: 'popup', mode })
      const outer = await open(page, 'outer')
      await open(page, 'inner')
      await pressMiddle(page, outer.first)
      const pressedOuter = await openNow(page, ['outer', 'inner'])
      await open(page, 'inner')
      const escapes = await focusAfter(page, ['Escape', 'Escape'])
      return { escapes, pressedOuter, stillOpen: await openNow(page, ['outer', 'inner']) }
    })
    expect(seen).toEqual({
      escapes: ['inner trigger', 'outer trigger'],
      pressedOuter: [true, false],
      stillOpen: [false, false],
    })
  })

  test('a press inside the inner one closes neither, and a press outside both closes both', async () => {
    const seen = await driven({ engine }, async (page) => {
      await put(page, { at: AT, id: 'outer', kind: 'popup', mode })
      await put(page, { id: 'inner', inside: 'outer', kind: 'popup', mode })
      await open(page, 'outer')
      const inner = await open(page, 'inner')
      await pressMiddle(page, inner.first)
      const inside = await openNow(page, ['outer', 'inner'])
      await page.mouse.click(AWAY.x, AWAY.y)
      return { inside, outside: await openNow(page, ['outer', 'inner']) }
    })
    expect(seen).toEqual({ inside: [true, true], outside: [false, false] })
  })
})

describe.each(CASES)('a modal in %s DOM, in %s', (mode, engine) => {
  test('keeps Tab inside it, going round both ways', async () => {
    const seen = await driven({ engine }, async (page) => {
      await put(page, { at: AT, id: 'm', kind: 'modal', mode })
      await open(page, 'm')
      return [await focused(page), ...(await focusAfter(page, ['Tab', 'Tab', 'Shift+Tab', 'Shift+Tab']))]
    })
    expect(seen).toEqual(['m first', 'm second', 'm first', 'm second', 'm first'])
  })

  test('leaves the rest of the page unreachable, and closes on a press on its backdrop', async () => {
    const seen = await driven({ engine }, async (page) => {
      await put(page, { at: AT, id: 'm', kind: 'modal', mode })
      await open(page, 'm')
      const reached = await tryFocusingOutside(page)
      const overModal = await openOverModal(page)
      await page.mouse.click(BACKDROP.x, BACKDROP.y)
      return { focus: await focused(page), open: await openNow(page, ['m']), overModal, reached }
    })
    expect(seen.overModal).toContain('has to be inside it')
    expect({ ...seen, overModal: '' }).toEqual({ focus: 'm trigger', open: [false], overModal: '', reached: false })
  })
})

describe.each(CASES)('a popup the app owns in %s DOM, in %s', (mode, engine) => {
  test('hears every dismissal with its reason, and stays open while the app keeps it so', async () => {
    const seen = await driven({ engine, options: { controlled: true } }, async (page) => {
      await put(page, { at: AT, id: 'a', kind: 'popup', mode })
      await hearDismissals(page, 'a')
      await setOpen(page, 'a', true)
      await page.keyboard.press('Escape')
      await page.mouse.click(AWAY.x, AWAY.y)
      return { heard: await dismissals(page), open: await openNow(page, ['a']) }
    })
    expect(seen).toEqual({ heard: ['escape', 'outside'], open: [true] })
  })
})

describe.each(CASES)('a popup leaving the page in %s DOM, in %s', (mode, engine) => {
  test('takes its layer out of the stack while it is out, and shows again when it is back', async () => {
    const seen = await driven({ engine }, async (page) => {
      await put(page, { at: AT, id: 'a', kind: 'popup', mode })
      await open(page, 'a')
      return detachAndReattach(page, 'a')
    })
    expect(seen).toEqual({ openWhileOut: true, shownBack: true, stackedWhileOut: 0 })
  })
})

describe.each(CASES)('a popup from the server in %s DOM, in %s', (mode, engine) => {
  test('is adopted with the same nodes, hidden, taking no room and moving nothing, then opens', async () => {
    const seen = await driven({ body: serverPopup(mode), engine, registered: false }, async (page) => {
      const adopted = await adoptServer(page)
      const opened = await open(page, 'server')
      return { adopted, opened: opened.shown }
    })
    expect(seen).toEqual({
      adopted: { hiddenAfter: true, hiddenBefore: true, moved: false, same: true },
      opened: true,
    })
  })
})

describe.each(CASES)('overlays in %s DOM, in %s, to an accessibility checker', (mode, engine) => {
  test('have no problems as the server renders them, nor open', async () => {
    const seen = await driven({ body: serverPopup(mode), engine, registered: false }, async (page) => {
      const closed = await audit(page, 'o-popup')
      await adoptServer(page)
      await open(page, 'server')
      const openPopup = await audit(page, 'o-popup')
      await page.keyboard.press('Escape')
      await put(page, { at: AT, id: 'm', kind: 'modal', mode })
      await open(page, 'm')
      return { closed, openModal: await audit(page, 'o-modal'), openPopup }
    })
    expect(seen).toEqual({ closed: [], openModal: [], openPopup: [] })
  })
})
