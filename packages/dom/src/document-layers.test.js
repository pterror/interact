import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { Layer, LayerStack } from '@interact/core'

import { BROWSERS, BROWSER_SETUP_MS, inBrowser, startBrowsers, stopBrowsers } from '../../../test/browser.js'
import { EscapeListener } from './document-layers.js'

const NONE = 0
/**
 * Whether a scrolling box's scrollbar takes room, by engine, as measured: Chrome's does with `scrollbar-gutter: stable`,
 * WebKit's with `::-webkit-scrollbar`; Firefox 157 headless keeps overlay scrollbars, which take none, whatever is set.
 * @type {Readonly<Record<import('../../../test/browser.js').Engine, boolean>>}
 */
const SCROLLBAR_TAKES_ROOM = { chrome: true, firefox: false, webkit: true }

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

/**
 * A stack with one layer open in it.
 * @returns {Readonly<{ layer: Layer, stack: LayerStack }>} The layer and its stack
 */
function openLayer() {
  const stack = new LayerStack()
  const layer = new Layer()
  stack.track(layer)
  layer.open.set(true)
  return { layer, stack }
}

/**
 * An open layer in a stack heard by an Escape listener on a root, with a field inside the root that may take Escape
 * first, and what one Escape pressed in the field did.
 * @param {Readonly<{ fieldTakes: boolean, composing: boolean }>} how - Whether the field takes Escape, and whether an
 *   input method is composing
 * @returns {Readonly<{ open: boolean, prevented: boolean }>} Whether the layer is still open, and whether Escape's
 *   default was prevented
 */
function escapeIn({ composing, fieldTakes }) {
  const { layer, stack } = openLayer()
  const root = document.createElement('div')
  const field = document.createElement('input')
  root.append(field)
  root.addEventListener('keydown', new EscapeListener(stack))
  if (fieldTakes) {
    field.addEventListener('keydown', (event) => {
      event.preventDefault()
    })
  }
  const escape = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    isComposing: composing,
    key: 'Escape',
  })
  field.dispatchEvent(escape)
  return { open: layer.open.get(), prevented: escape.defaultPrevented }
}

describe('Escape heard after the page', () => {
  test('dismisses the top layer when nothing inside took it, and is then the layer’s', () => {
    expect(escapeIn({ composing: false, fieldTakes: false })).toEqual({ open: false, prevented: true })
  })

  test('leaves the layer open when a control inside took it first', () => {
    expect(escapeIn({ composing: false, fieldTakes: true })).toEqual({ open: true, prevented: true })
  })

  test('leaves the layer open while an input method composes', () => {
    expect(escapeIn({ composing: true, fieldTakes: false })).toEqual({ open: true, prevented: false })
  })
})
