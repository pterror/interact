import { afterAll, describe, expect, test } from 'bun:test'

import { BROWSERS, closeBrowser, inBrowser } from '../../../test/browser.js'

const NONE = 0
/**
 * Whether a scrolling box's scrollbar takes room, by engine, as measured: Chrome's does with `scrollbar-gutter: stable`,
 * WebKit's with `::-webkit-scrollbar`; Firefox 157 headless keeps overlay scrollbars, which take none, whatever is set.
 * @type {Readonly<Record<import('../../../test/browser.js').Engine, boolean>>}
 */
const SCROLLBAR_TAKES_ROOM = { chrome: true, firefox: false, webkit: true }

afterAll(closeBrowser)

describe.each(BROWSERS)('what is inside a layer, in %s', (engine) => {
  test('a press on its element, inside its shadow root, or on its anchor; not one elsewhere', async () => {
    const seen = await inBrowser({ engine, moduleUrl: import.meta.url }, async () => {
      const { insideLayer } = await import('./test-trees.js')
      return insideLayer()
    })
    expect(seen).toEqual({ anchor: true, element: true, inShadow: true, outside: false })
  })

  test('a press on a scrollbar that takes room is scrolling, not a press outside', async () => {
    const seen = await inBrowser({ engine, moduleUrl: import.meta.url }, async () => {
      const { scrollbar } = await import('./test-trees.js')
      return scrollbar()
    })
    const takesRoom = SCROLLBAR_TAKES_ROOM[engine]
    expect([seen.gutter > NONE, seen.onBar, seen.inside]).toEqual([takesRoom, takesRoom, false])
  })
})
