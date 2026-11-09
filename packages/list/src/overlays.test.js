import { afterEach, describe, expect, test } from 'bun:test'

import { cell } from './cell.js'
import { dismiss } from './dismiss.js'
import { focusWhen } from './focus-when.js'
import { hoverIntent } from './hover-intent.js'
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
