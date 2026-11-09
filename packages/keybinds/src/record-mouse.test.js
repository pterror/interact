import { afterEach, describe, expect, test } from 'bun:test'

import { isMac } from './modifiers.js'
import { mouseBinding, recordMouse } from './record-mouse.js'

const LEFT = 0
const MIDDLE = 1
const RIGHT = 2
const BACK = 3
const FORWARD = 4
const UNNAMED = 5

/** @type {(() => void)[]} */
const cleanups = []

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) {
    cleanup()
  }
})

/**
 * A mouse event that can be cancelled
 * @param {string} type - "mousedown", "mouseup", ...
 * @param {number} button - Which button
 * @param {MouseEventInit} [init] - More of it
 * @returns {MouseEvent} The event
 */
function mouse(type, button, init = {}) {
  return new MouseEvent(type, { button, cancelable: true, ...init })
}

describe('mouseBinding', () => {
  test('names each button, with modifiers before it', () => {
    expect(
      [LEFT, MIDDLE, RIGHT, BACK, FORWARD, UNNAMED].map((button) => mouseBinding(mouse('mousedown', button))),
    ).toEqual(['click', 'middle', 'right', 'back', 'forward', undefined])
    const own = isMac ? { metaKey: true } : { ctrlKey: true }
    expect(mouseBinding(mouse('mousedown', LEFT, { ...own, altKey: true, shiftKey: true }))).toBe(
      '$mod+alt+shift+click',
    )
    expect(mouseBinding(new WheelEvent('wheel', { deltaX: 1, deltaY: -1 }))).toBe('scrollup')
  })
})

/**
 * Records a mouse binding from the window
 * @param {boolean} release - Whether to record a release
 * @returns {readonly string[]} What was recorded
 */
function recording(release) {
  /** @type {string[]} */
  const got = []
  cleanups.push(
    recordMouse({
      done: (binding) => {
        got.push(binding)
      },
      release,
    }),
  )
  return got
}

describe('recordMouse', () => {
  test('takes the next click, keeping it from anything else', () => {
    const got = recording(false)
    const click = mouse('mousedown', MIDDLE)
    globalThis.dispatchEvent(click)
    expect([got, click.defaultPrevented]).toEqual([['middle'], true])
  })

  test('with a release, waits for the same button to come up', () => {
    const got = recording(true)
    globalThis.dispatchEvent(mouse('mousedown', MIDDLE))
    globalThis.dispatchEvent(mouse('mouseup', LEFT))
    expect(got).toEqual([])
    globalThis.dispatchEvent(mouse('mouseup', MIDDLE))
    expect(got).toEqual(['middle:up'])
  })

  test('takes a scroll, which has no release', () => {
    const scrolled = recording(false)
    const released = recording(true)
    globalThis.dispatchEvent(new WheelEvent('wheel', { cancelable: true, deltaY: 1 }))
    expect([scrolled, released]).toEqual([['scrolldown'], []])
  })

  test('hears nothing once stopped, nor what it is told to leave alone', () => {
    /** @type {string[]} */
    const got = []
    const stop = recordMouse({
      done: (binding) => {
        got.push(binding)
      },
      ignore: (event) => event instanceof MouseEvent && event.button === LEFT,
    })
    globalThis.dispatchEvent(mouse('mousedown', LEFT))
    stop()
    globalThis.dispatchEvent(mouse('mousedown', MIDDLE))
    expect(got).toEqual([])
  })
})
