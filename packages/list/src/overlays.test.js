import { afterEach, describe, expect, test } from 'bun:test'

import { cell } from './cell.js'
import { dismiss } from './dismiss.js'
import { focusWhen } from './focus-when.js'
import { hoverIntent } from './hover-intent.js'
import { inView } from './in-view.js'
import { popover } from './popover.js'

const REST = 10
const LONGER = 40

/** @type {(() => void)[]} */
const cleanups = []

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) {
    cleanup()
  }
})

/**
 * An element in the page, taken out after the test
 * @param {string} [tag] - Its tag (default div)
 * @returns {HTMLElement} The element
 */
function put(tag = 'div') {
  const element = document.createElement(tag)
  document.body.append(element)
  cleanups.push(() => {
    element.remove()
  })
  return element
}

/**
 * An element that can be shown as a popover, as browsers have it and happy-dom doesn't, noting each show and hide
 * @returns {Readonly<{ element: HTMLElement, shown: () => readonly string[] }>} It, and its shows and hides
 */
function popoverElement() {
  const element = put()
  /** @type {string[]} */
  const shown = []
  let open = false
  Object.assign(element, {
    hidePopover() {
      open = false
      shown.push('hide')
    },
    matches(/** @type {string} */ selector) {
      return selector === ':popover-open' ? open : false
    },
    showPopover() {
      open = true
      shown.push('show')
    },
  })
  return { element, shown: () => shown }
}

describe('popover', () => {
  test('shows its element while open, as a manual popover placed against its anchor', () => {
    const { element, shown } = popoverElement()
    const anchor = put('button')
    const open = cell(false)
    const stop = popover({ anchor, element, open, side: 'right' })
    expect([element.popover, shown()]).toEqual(['manual', []])
    open.set(true)
    expect([shown(), element.style.inset, element.style.left, element.style.top]).toEqual([
      ['show'],
      'auto',
      '0px',
      '0px',
    ])
    open.set(false)
    expect(shown()).toEqual(['show', 'hide'])
    open.set(true)
    stop()
    expect(shown()).toEqual(['show', 'hide', 'show', 'hide'])
    open.set(false)
    open.set(true)
    expect(shown()).toHaveLength(4)
  })

  test('centres its element on a point, or on any box', () => {
    const { element } = popoverElement()
    const at = { x: 120, y: 80 }
    const point = {
      getBoundingClientRect: () => ({ bottom: at.y, left: at.x, right: at.x, top: at.y }),
    }
    cleanups.push(popover({ anchor: point, element, open: cell(true), side: 'center' }))
    expect([element.style.left, element.style.top, element.style.translate]).toEqual(['120px', '80px', '-50% -50%'])
    const other = popoverElement().element
    const box = { getBoundingClientRect: () => ({ bottom: 300, left: 0, right: 400, top: 100 }) }
    cleanups.push(popover({ anchor: box, element: other, open: cell(true), side: 'center' }))
    expect([other.style.left, other.style.top]).toEqual(['200px', '200px'])
  })
})

describe('focusWhen', () => {
  test('focuses its element when the boolean becomes true, once the change has been heard everywhere', async () => {
    const element = put('button')
    const other = put('button')
    const when = cell(false)
    cleanups.push(focusWhen({ element, when }))
    other.focus()
    when.set(true)
    expect(document.activeElement).toBe(other)
    await Promise.resolve()
    expect(document.activeElement).toBe(element)
    other.focus()
    when.set(false)
    when.set(true)
    when.set(false)
    await Promise.resolve()
    expect(document.activeElement).toBe(other)
  })
})

describe('dismiss', () => {
  test('closes on a press outside its elements, and on an Escape nothing else took', () => {
    const button = put('button')
    const menu = put()
    const inner = put()
    menu.append(inner)
    const elsewhere = put()
    const open = cell(true)
    cleanups.push(dismiss({ elements: [button, menu], to: open.set }))
    inner.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }))
    button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }))
    expect(open.get()).toBe(true)
    elsewhere.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }))
    expect(open.get()).toBe(false)
    open.set(true)
    const taken = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape' })
    inner.addEventListener(
      'keydown',
      (event) => {
        event.preventDefault()
      },
      { once: true },
    )
    inner.dispatchEvent(taken)
    expect(open.get()).toBe(true)
    inner.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape' }))
    expect(open.get()).toBe(false)
  })
})

describe('hoverIntent', () => {
  test('hands on the key the pointer rests on, not those it passes over', async () => {
    const menu = put()
    const items = ['Cut', 'Copy', 'Share'].map((key) => {
      const item = put()
      item.dataset['key'] = key
      menu.append(item)
      return item
    })
    /** @type {string[]} */
    const rested = []
    cleanups.push(
      hoverIntent({
        element: menu,
        itemOf: (target) => {
          const key = target instanceof HTMLElement ? target.dataset['key'] : undefined
          return key === undefined ? undefined : { key }
        },
        rest: REST,
        to: (key) => {
          rested.push(key)
        },
      }),
    )
    for (const item of items) {
      item.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }))
    }
    await Bun.sleep(LONGER)
    expect(rested).toEqual(['Share'])
    items[0]?.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }))
    menu.dispatchEvent(new PointerEvent('pointerleave'))
    await Bun.sleep(LONGER)
    expect(rested).toEqual(['Share'])
  })
})

/**
 * A margin set inline, in px
 * @param {string} value - The inline value
 * @returns {number} Its px, 0 for none
 */
function margin(value) {
  return Number(value.replace(/px$/u, '')) || 0
}

/**
 * An element laid out at `at`, moved by its own margins, as a browser lays out a fixed element
 * @param {Readonly<{ left: number, top: number, width: number, height: number }>} at - Its box before any margin
 * @returns {HTMLElement} The element
 */
function boxed(at) {
  const element = put()
  Object.defineProperties(element, {
    offsetHeight: { get: () => at.height },
    offsetLeft: { get: () => at.left + margin(element.style.marginLeft) },
    offsetTop: { get: () => at.top + margin(element.style.marginTop) },
    offsetWidth: { get: () => at.width },
  })
  return element
}

describe('inView', () => {
  test('moves an element that overflows the window back inside it, by its margins, once shown', async () => {
    const at = { height: 100, left: window.innerWidth - 50, top: 20, width: 300 }
    const element = boxed(at)
    const open = cell(false)
    cleanups.push(inView({ element, open }))
    open.set(true)
    expect(element.style.marginLeft).toBe('')
    await Promise.resolve()
    expect(element.offsetLeft + element.offsetWidth).toBe(window.innerWidth - 8)
    expect(element.style.marginTop).toBe('')
    open.set(false)
    expect(element.style.marginLeft).toBe('')
  })

  test('keeps the start edges in when the box is larger than the window, and leaves a box that fits', async () => {
    const element = boxed({ height: window.innerHeight * 2, left: -40, top: -10, width: 100 })
    cleanups.push(inView({ element, margin: 4, open: cell(true) }))
    await Promise.resolve()
    expect([element.offsetLeft, element.offsetTop]).toEqual([4, 4])
    const fits = boxed({ height: 10, left: 30, top: 30, width: 10 })
    cleanups.push(inView({ element: fits, open: cell(true) }))
    await Promise.resolve()
    expect([fits.style.marginLeft, fits.style.marginTop]).toEqual(['', ''])
  })

  test('fits again before the next frame after the window resizes, and a placement since is kept', async () => {
    const at = { height: 50, left: 10, top: 10, width: 100 }
    const element = boxed(at)
    cleanups.push(inView({ element, open: cell(true) }))
    await Promise.resolve()
    at.left = window.innerWidth - 20
    element.style.marginLeft = '0px'
    globalThis.dispatchEvent(new Event('resize'))
    await Bun.sleep(LONGER)
    expect(element.offsetLeft + element.offsetWidth).toBe(window.innerWidth - 8)
  })

  test('stops, taking its move off', async () => {
    const element = boxed({ height: 10, left: -100, top: 0, width: 10 })
    const stop = inView({ element, open: cell(true) })
    await Promise.resolve()
    expect(element.style.marginLeft).toBe('108px')
    stop()
    expect(element.style.marginLeft).toBe('')
  })
})
