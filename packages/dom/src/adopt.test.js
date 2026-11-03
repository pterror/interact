import { afterAll, describe, expect, test } from 'bun:test'

import { BROWSERS, closeBrowser, inBrowser } from '../../../test/browser.js'

const ONE = 1

afterAll(closeBrowser)

describe.each(BROWSERS)('adoptStyles, in %s', (engine) => {
  test('adopts one constructed sheet per root, however many instances there are', async () => {
    const adopted = await inBrowser({ engine, moduleUrl: import.meta.url }, async () => {
      const { adoptTwice } = await import('./test-pages.js')
      return adoptTwice()
    })
    expect(adopted).toEqual({ document: ONE, sameSheet: true, shadow: ONE })
  })
})
