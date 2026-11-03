import { afterAll, describe, expect, test } from 'bun:test'

import { closeBrowser, inBrowser } from '../../../test/browser.js'

const ONE = 1

afterAll(closeBrowser)

describe('adoptStyles, in Chrome', () => {
  test('adopts one constructed sheet per root, however many instances there are', async () => {
    const adopted = await inBrowser(import.meta.url, async () => {
      const { adoptTwice } = await import('./test-pages.js')
      return adoptTwice()
    })
    expect(adopted).toEqual({ document: ONE, sameSheet: true, shadow: ONE })
  })
})
