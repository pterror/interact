import { afterAll, describe, expect, test } from 'bun:test'

import { BROWSERS, closeBrowser, inBrowser } from '../../../test/browser.js'
import { component } from './component.js'
import { register } from './register.js'
import { renderComponent, stylesheetAttributes, stylesheetText } from './render-component.js'
import { Counter, counterView, renderingView } from './test-helpers.js'

const RED = 'rgb(255, 0, 0)'
const BLUE = 'rgb(0, 0, 255)'
const ONE = 1
const NONE = 0

afterAll(closeBrowser)

describe('component', () => {
  test('makes each behavior from its element, and tells the view each time it has rendered', async () => {
    /** @type {HTMLElement[]} */
    const hosts = []
    const counter = new Counter()
    const seen = renderingView()
    const Rendering = component(seen.view, (host) => {
      hosts.push(host)
      return counter
    })
    register([Rendering], { prefix: 'seen' })
    const element = document.createElement('seen-rendering')
    document.body.append(element)
    counter.increment()
    await Promise.resolve()
    expect([hosts, seen.log]).toEqual([[element], ['rendered 0', 'rendered 1']])
  })
})

describe.each(BROWSERS)('component, in %s', (engine) => {
  test('styles with one stylesheet in shadow and light DOM, stopping at a component inside', async () => {
    const colors = await inBrowser({ engine, moduleUrl: import.meta.url }, async () => {
      const { bothModes } = await import('./test-pages.js')
      return bothModes()
    })
    expect(colors).toEqual({
      light: { badge: RED, count: BLUE, host: RED },
      shadow: { badge: RED, count: BLUE, host: RED },
    })
  })
})

describe.each(BROWSERS)('component shadow server markup, in %s', (engine) => {
  test('adopts shadow server markup: same nodes, styled before it upgrades, then live', async () => {
    const markup = renderComponent(counterView, new Counter(), { mode: 'shadow', prefix: 't', styles: 'inline' })
    const seen = await inBrowser({ body: markup, engine, moduleUrl: import.meta.url }, async () => {
      const { adoptServerCounter } = await import('./test-pages.js')
      return adoptServerCounter()
    })
    expect(seen).toEqual({ adopted: ONE, colorBefore: BLUE, same: true, serverStyles: NONE, text: '1' })
  })
})

describe.each(BROWSERS)('component server markup, in %s', (engine) => {
  test("adopts light server markup, using the page's stylesheet instead of adopting another", async () => {
    const styles = `<style ${stylesheetAttributes(['counter'])}>${stylesheetText(counterView, 'light')}</style>`
    const markup = renderComponent(counterView, new Counter(), { mode: 'light', prefix: 't' })
    const seen = await inBrowser({ body: `${styles}${markup}`, engine, moduleUrl: import.meta.url }, async () => {
      const { adoptServerCounter } = await import('./test-pages.js')
      return adoptServerCounter()
    })
    expect(seen).toEqual({ adopted: NONE, colorBefore: BLUE, same: true, serverStyles: Number.NaN, text: '1' })
  })

  test('links shadow instances to one stylesheet instead of inlining it', async () => {
    const href = `data:text/css,${encodeURIComponent(stylesheetText(counterView, 'shadow'))}`
    const markup = renderComponent(counterView, new Counter(), { mode: 'shadow', prefix: 't', styles: { href } })
    const seen = await inBrowser({ body: markup, engine, moduleUrl: import.meta.url }, async () => {
      const { adoptServerCounter } = await import('./test-pages.js')
      return adoptServerCounter()
    })
    expect(seen).toEqual({ adopted: ONE, colorBefore: BLUE, same: true, serverStyles: NONE, text: '1' })
  })
})
