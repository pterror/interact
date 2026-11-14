import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { cell } from './cell.js'
import { popover } from './popover.js'

/**
 * An element with the popover methods the test DOM lacks
 * @returns {HTMLElement} It, in the page
 */
function shown() {
  const element = document.createElement('div')
  let open = false
  element.showPopover = () => {
    open = true
  }
  element.hidePopover = () => {
    open = false
  }
  const matches = element.matches.bind(element)
  /**
   * Whether it matches, shown or not as `showPopover` and `hidePopover` left it
   * @param {string} selectors - What to match
   * @returns {boolean} Whether it does
   */
  const matching = (selectors) => (selectors === ':popover-open' ? open : matches(selectors))
  Object.defineProperty(element, 'matches', { value: matching })
  document.body.append(element)
  return element
}

/**
 * A popover of a size below a box
 * @param {Readonly<{ left: number, top: number, right: number, bottom: number }>} box - The anchor's box
 * @returns {HTMLElement} It, shown
 */
function below(box) {
  const element = shown()
  Object.defineProperties(element, { offsetHeight: { value: 100 }, offsetWidth: { value: 200 } })
  popover({ anchor: { getBoundingClientRect: () => box }, element, open: cell(true) })
  return element
}

describe('popover', () => {
  beforeEach(() => {
    Object.defineProperties(document.documentElement, {
      clientHeight: { configurable: true, value: 768 },
      clientWidth: { configurable: true, value: 1024 },
    })
  })

  afterEach(() => {
    Reflect.deleteProperty(document.documentElement, 'clientHeight')
    Reflect.deleteProperty(document.documentElement, 'clientWidth')
  })

  test('beside its anchor on the left, it ends where the anchor starts, level with its top', () => {
    const element = shown()
    const stop = popover({
      anchor: { getBoundingClientRect: () => ({ bottom: 140, left: 300, right: 324, top: 120 }) },
      element,
      open: cell(true),
      side: 'left',
    })
    expect(element.style.right).toBe(`${String(document.documentElement.clientWidth - 300)}px`)
    expect(element.style.top).toBe('120px')
    expect(element.matches(':popover-open')).toBe(true)
    stop()
    expect(element.matches(':popover-open')).toBe(false)
    element.remove()
  })

  test("flips to the anchor's other side across, then along, to keep a margin inside the window", () => {
    const { clientHeight, clientWidth } = document.documentElement
    const fits = below({ bottom: 40, left: 20, right: 60, top: 20 })
    expect([fits.style.left, fits.style.top]).toEqual(['20px', '40px'])
    const nearRight = below({ bottom: 40, left: clientWidth - 100, right: clientWidth - 60, top: 20 })
    expect([nearRight.style.right, nearRight.style.top]).toEqual(['60px', '40px'])
    const nearBottom = below({ bottom: clientHeight - 50, left: 20, right: 60, top: clientHeight - 70 })
    expect([nearBottom.style.left, nearBottom.style.bottom]).toEqual(['20px', '70px'])
    const marginOnly = below({ bottom: 40, left: clientWidth - 205, right: clientWidth - 150, top: 20 })
    expect(marginOnly.style.right).toBe('150px')
    const corner = below({
      bottom: clientHeight - 50,
      left: clientWidth - 100,
      right: clientWidth - 60,
      top: clientHeight - 70,
    })
    expect([corner.style.right, corner.style.bottom]).toEqual(['60px', '70px'])
  })

  test('stays as first placed when no flip fits, and centred is never flipped', () => {
    const { clientWidth } = document.documentElement
    const element = shown()
    Object.defineProperties(element, { offsetHeight: { value: 10 }, offsetWidth: { value: clientWidth * 2 } })
    popover({
      anchor: { getBoundingClientRect: () => ({ bottom: 40, left: 20, right: 60, top: 20 }) },
      element,
      open: cell(true),
    })
    expect([element.style.left, element.style.top]).toEqual(['20px', '40px'])
    const centred = shown()
    Object.defineProperties(centred, { offsetHeight: { value: 10 }, offsetWidth: { value: 400 } })
    const point = { bottom: 10, left: clientWidth - 5, right: clientWidth - 5, top: 10 }
    popover({ anchor: { getBoundingClientRect: () => point }, element: centred, open: cell(true), side: 'center' })
    expect(centred.style.left).toBe(`${String(clientWidth - 5)}px`)
  })
})
