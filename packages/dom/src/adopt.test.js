import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { BROWSERS, BROWSER_SETUP_MS, inBrowser, startBrowsers, stopBrowsers } from '../../../test/browser.js'

const ONE = 1

beforeAll(startBrowsers, BROWSER_SETUP_MS)
afterAll(stopBrowsers, BROWSER_SETUP_MS)

describe.each(BROWSERS)('adoptStyles, in %s', (engine) => {
  test('adopts one constructed sheet per root, however many instances there are', async () => {
    const adopted = await inBrowser({ engine, moduleUrl: import.meta.url }, async () => {
      const { adoptTwice } = await import('./test-pages.js')
      return adoptTwice()
    })
    expect(adopted).toEqual({ document: ONE, sameSheet: true, shadow: ONE })
  })
})
