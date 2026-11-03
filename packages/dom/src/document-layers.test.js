import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { BROWSERS, BROWSER_SETUP_MS, inBrowser, startBrowsers, stopBrowsers } from '../../../test/browser.js'

beforeAll(startBrowsers, BROWSER_SETUP_MS)
afterAll(stopBrowsers, BROWSER_SETUP_MS)

describe.each(BROWSERS)("a document's layers, in %s", (engine) => {
  test('a touch outside dismisses only once it becomes a click, so scrolling with a finger dismisses nothing', async () => {
    const seen = await inBrowser({ engine, moduleUrl: import.meta.url }, async () => {
      const { touchThenClick } = await import('./test-layers.js')
      return touchThenClick()
    })
    expect(seen).toEqual({ afterClick: false, afterTouch: true })
  })

  test('Escape while an input method composes is the input method’s; after, it dismisses and is taken', async () => {
    const seen = await inBrowser({ engine, moduleUrl: import.meta.url }, async () => {
      const { escapeWhileComposing } = await import('./test-layers.js')
      return escapeWhileComposing()
    })
    expect(seen).toEqual({ after: false, composing: true, prevented: true })
  })

  test('a press that dismisses goes on until the pointer comes up', async () => {
    const seen = await inBrowser({ engine, moduleUrl: import.meta.url }, async () => {
      const { pressThenUp } = await import('./test-layers.js')
      return pressThenUp()
    })
    expect(seen).toEqual({ dismissed: true, endedAfterUp: true, endedBeforeUp: false })
  })
  test('focus leaving the page dismisses only when a Tab took it, not when the window lost it', async () => {
    const seen = await inBrowser({ engine, moduleUrl: import.meta.url }, async () => {
      const { focusLeavesPage } = await import('./test-layers.js')
      return focusLeavesPage()
    })
    expect(seen).toEqual({ tabbedOut: false, windowLeft: true })
  })
})
