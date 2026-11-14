import { describe, expect, test } from 'bun:test'

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

describe('popover', () => {
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
    expect(element.style.left).toBe('')
    expect(element.matches(':popover-open')).toBe(true)
    stop()
    expect(element.matches(':popover-open')).toBe(false)
    element.remove()
  })
})
