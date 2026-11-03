import { afterAll, describe, expect, test } from 'bun:test'

import { BROWSERS, closeBrowser, inBrowser } from '../../../test/browser.js'

afterAll(closeBrowser)

describe.each(BROWSERS)('giving focus back, in %s', (engine) => {
  test('returns it to where it came from when it is still inside the hidden overlay', async () => {
    const seen = await inBrowser({ engine, moduleUrl: import.meta.url }, async () => {
      const { focusBack } = await import('./test-focus-return.js')
      return focusBack('stays inside')
    })
    expect(seen).toBe('opener')
  })

  test('leaves it where something else took it', async () => {
    const seen = await inBrowser({ engine, moduleUrl: import.meta.url }, async () => {
      const { focusBack } = await import('./test-focus-return.js')
      return focusBack('taken elsewhere')
    })
    expect(seen).toBe('other')
  })

  test('leaves it lost when where it came from has left the page', async () => {
    const seen = await inBrowser({ engine, moduleUrl: import.meta.url }, async () => {
      const { focusBack } = await import('./test-focus-return.js')
      return focusBack('opener gone')
    })
    expect(seen).toBe('inside')
  })
})
