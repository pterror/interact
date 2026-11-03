/**
 * What browser tests run in their pages: each registers the test elements and reports what it saw, as plain values.
 */

import { adoptStyles } from './adopt.js'
import { register } from './register.js'
import { counterView, testElements } from './test-helpers.js'

/**
 * Computed colors in a component, by part.
 * @typedef {Readonly<{ host: string, count: string, badge: string }>} Colors
 */

/**
 * What adopting server markup left: whether the count is the server's node, its text after a click, its color before
 * the element upgraded, and how many stylesheets the root adopted and the server left.
 * @typedef {Readonly<{ same: boolean, text: string, colorBefore: string, adopted: number, serverStyles: number }>} Adopted
 */

/**
 * Registers the counter and badge as `t-counter` and `t-badge`.
 * @returns {void}
 */
function registerTestElements() {
  const { BadgeElement, CounterElement } = testElements()
  register([CounterElement, BadgeElement], { prefix: 't' })
}

/**
 * An element's computed color, or "missing".
 * @param {Element | null | undefined} element - The element
 * @returns {string} Its color
 */
function colorOf(element) {
  return element ? getComputedStyle(element).color : 'missing'
}

/**
 * A counter in a DOM mode, with a light-DOM badge put inside its view.
 * @param {'shadow' | 'light'} mode - Where the counter lives
 * @returns {Colors} The colors of its host, its count and the badge's count
 */
function colorsIn(mode) {
  const counter = document.createElement('t-counter')
  counter.setAttribute('dom-mode', mode)
  document.body.append(counter)
  const root = counter.shadowRoot ?? counter
  const view = counter.shadowRoot?.querySelector('[data-interact-view]') ?? counter
  const badge = document.createElement('t-badge')
  badge.setAttribute('dom-mode', 'light')
  view.append(badge)
  return {
    badge: colorOf(badge.querySelector('span')),
    count: colorOf(root.querySelector('button')),
    host: colorOf(counter),
  }
}

/**
 * Registers the test elements, then shows a counter in each DOM mode.
 * @returns {Readonly<{ shadow: Colors, light: Colors }>} Their colors
 */
function bothModes() {
  registerTestElements()
  return { light: colorsIn('light'), shadow: colorsIn('shadow') }
}

/**
 * Upgrades the server-rendered counter in the page, clicks its count, and reports what happened.
 * @returns {Promise<Adopted>} What adopting left
 */
async function adoptServerCounter() {
  const host = document.querySelector('t-counter')
  const root = host?.shadowRoot ?? host
  const before = root?.querySelector('button') ?? undefined
  const colorBefore = colorOf(before)
  registerTestElements()
  before?.click()
  await Promise.resolve()
  return {
    adopted: (host?.shadowRoot ?? document).adoptedStyleSheets.length,
    colorBefore,
    same: root?.querySelector('button') === before,
    serverStyles: host?.shadowRoot?.querySelectorAll('style, link').length ?? Number.NaN,
    text: before?.textContent ?? '',
  }
}

/**
 * Adopts the counter's styles twice in the document (light DOM) and twice in each of two shadow roots.
 * @returns {Readonly<{ document: number, shadow: number, sameSheet: boolean }>} How many sheets each root adopted, and
 *   whether both shadow roots share one
 */
function adoptTwice() {
  const first = document.createElement('div').attachShadow({ mode: 'open' })
  const second = document.createElement('div').attachShadow({ mode: 'open' })
  for (const root of [document, document, first, first, second]) {
    adoptStyles(root, counterView.styles, { kind: 'counter', mode: root === document ? 'light' : 'shadow' })
  }
  const [firstSheet] = first.adoptedStyleSheets
  const [secondSheet] = second.adoptedStyleSheets
  return {
    document: document.adoptedStyleSheets.length,
    sameSheet: firstSheet !== undefined && firstSheet === secondSheet,
    shadow: first.adoptedStyleSheets.length,
  }
}

export { adoptServerCounter, adoptTwice, bothModes }
