import { afterAll, describe, expect, test } from 'bun:test'

import { BROWSERS, closeBrowser, inBrowser } from '../../../test/browser.js'

afterAll(closeBrowser)

describe.each(BROWSERS)('the flat tree, in %s', (engine) => {
  test('goes through shadow roots and slots, and finds focus inside a shadow root', async () => {
    const seen = await inBrowser({ engine, moduleUrl: import.meta.url }, async () => {
      const { flatTree } = await import('./test-trees.js')
      return flatTree()
    })
    expect(seen).toEqual({
      children: ['button', 'slot'],
      deep: 'inner',
      hostHasInner: true,
      hostHasOutside: false,
      hostHasSlotted: true,
      slotChildren: ['slotted'],
      slotHasSlotted: true,
    })
  })
})
