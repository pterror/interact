import { describe, expect, mock, test } from 'bun:test'

import { wheelDirection } from './mouse-wheel.js'
import { keybinds } from './test-helpers.js'

const ONCE = 1
const TWICE = 2
const NOTCH = 100
const TRACKPAD_DELTA = 12
const TRACKPAD_EVENTS = 10
const PIXELS = 0
const LINES = 1
const THREE = 3
const ONE = 1
const SHORT_IDLE = 30
const LONGER = 60
const HALF_STEP = 40
const MORE_THAN_A_STEP = 60
const UP = -1
const RIGHT = 1

/**
 * A wheel event that can be cancelled. happy-dom's WheelEvent ignores modifier keys, so these tests bind plain
 * scrolling
 * @param {number} deltaY - How far it scrolls down
 * @param {number} [deltaMode] - In pixels, lines or pages
 * @returns {WheelEvent} The event
 */
function wheel(deltaY, deltaMode = PIXELS) {
  return new WheelEvent('wheel', { cancelable: true, deltaMode, deltaY })
}

/**
 * Listens for one scroll-down command on a target of its own
 * @param {() => unknown} execute - The command's action
 * @param {Readonly<{ idle?: number }>} [wheelOptions] - How scrolling steps
 * @returns {Readonly<{ stop: () => void, target: HTMLElement }>} The target, and how to stop
 */
function zoom(execute, wheelOptions = {}) {
  const target = document.createElement('div')
  const stop = keybinds([{ execute, id: 'z', label: 'Zoom out', mouse: ['scrolldown'] }], undefined, {
    target,
    wheel: wheelOptions,
  })
  return { stop, target }
}

describe('wheelDirection', () => {
  test('is vertical when the wheel moves vertically, otherwise horizontal', () => {
    expect(wheelDirection(new WheelEvent('wheel', { deltaX: RIGHT, deltaY: UP }))).toBe('scrollup')
    expect(wheelDirection(new WheelEvent('wheel', { deltaX: RIGHT }))).toBe('scrollright')
    expect(wheelDirection(new WheelEvent('wheel', {}))).toBeUndefined()
  })
})

describe('scroll gestures', () => {
  test('a mouse-wheel notch is one step', () => {
    const execute = mock(() => undefined)
    const { stop, target } = zoom(execute)
    target.dispatchEvent(wheel(NOTCH))
    expect(execute).toHaveBeenCalledTimes(ONCE)
    stop()
  })

  test("a trackpad's small deltas add up to a step, and the page doesn't scroll in between", () => {
    const execute = mock(() => undefined)
    const { stop, target } = zoom(execute)
    const events = Array.from({ length: TRACKPAD_EVENTS }, () => wheel(TRACKPAD_DELTA))
    for (const event of events) {
      target.dispatchEvent(event)
    }
    expect(execute).toHaveBeenCalledTimes(TWICE)
    expect(events.every((event) => event.defaultPrevented)).toBe(true)
    stop()
  })

  test('lines count as pixels', () => {
    const execute = mock(() => undefined)
    const { stop, target } = zoom(execute)
    target.dispatchEvent(wheel(THREE, LINES))
    expect(execute).not.toHaveBeenCalled()
    target.dispatchEvent(wheel(ONE, LINES))
    expect(execute).toHaveBeenCalledTimes(ONCE)
    stop()
  })
})

describe('scroll gestures ending', () => {
  test('a pause starts a new gesture', async () => {
    const execute = mock(() => undefined)
    const { stop, target } = zoom(execute, { idle: SHORT_IDLE })
    target.dispatchEvent(wheel(HALF_STEP))
    await Bun.sleep(LONGER)
    target.dispatchEvent(wheel(HALF_STEP))
    expect(execute).not.toHaveBeenCalled()
    stop()
  })

  test('a command returning false gives the gesture back to the page', () => {
    const execute = mock(() => false)
    const { stop, target } = zoom(execute)
    target.dispatchEvent(wheel(MORE_THAN_A_STEP))
    const later = wheel(MORE_THAN_A_STEP)
    target.dispatchEvent(later)
    expect(execute).toHaveBeenCalledTimes(ONCE)
    expect(later.defaultPrevented).toBe(false)
    stop()
  })
})
