import { afterEach, describe, expect, test } from 'bun:test'

import { bottomIn } from './bottom-in.js'

/** @type {Set<FakeResizeObserver>} */
const observers = new Set()

class FakeResizeObserver {
  /** @param {ResizeObserverCallback} callback - Called when an observed element is said to have resized */
  constructor(callback) {
    this.callback = callback
    /** @type {Element[]} */
    this.observed = []
    observers.add(this)
  }

  /** @param {Element} element - The element to observe */
  observe(element) {
    this.observed.push(element)
  }

  /** @param {Element} element - The element to stop observing */
  unobserve(element) {
    this.observed = this.observed.filter((observed) => observed !== element)
  }

  disconnect() {
    observers.delete(this)
  }
}

const real = globalThis.ResizeObserver

afterEach(() => {
  observers.clear()
  globalThis.ResizeObserver = real
})

const resized = (/** @type {Element} */ element) => {
  for (const observer of observers) {
    if (observer.observed.includes(element)) {
      observer.callback([], observer)
    }
  }
}

/**
 * @param {Element} element - The element to place
 * @param {() => number} top - Its top in the window, asked each time it is measured
 * @param {() => number} height - Its height, asked each time it is measured
 */
const placeAt = (element, top, height) => {
  element.getBoundingClientRect = () => new globalThis.window.DOMRect(0, top(), 0, height())
}

describe('bottomIn', () => {
  test("is the element's bottom in the container's content, heard when it or something above it changes size", () => {
    globalThis.ResizeObserver = FakeResizeObserver
    const container = document.createElement('div')
    const above = document.createElement('div')
    const list = document.createElement('div')
    container.append(above, list)
    let aboveHeight = 120
    let listHeight = 300
    placeAt(
      container,
      () => 50,
      () => 400,
    )
    placeAt(
      list,
      () => 50 + aboveHeight,
      () => listHeight,
    )
    const bottom = bottomIn(list, container)
    expect(bottom.get()).toBe(420)
    let heard = 0
    const stop = bottom.watch(() => {
      heard += 1
    })
    resized(above)
    expect(heard).toBe(0)
    aboveHeight = 200
    resized(above)
    listHeight = 360
    resized(list)
    expect([bottom.get(), heard]).toEqual([560, 2])
    stop()
    aboveHeight = 10
    resized(above)
    expect([heard, observers.size]).toEqual([2, 0])
  })
})
