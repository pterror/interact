import { describe, expect, test } from 'bun:test'

import { eventToMouseBindingString, formatMouseParts, mouseUI } from './mouse-ui.js'
import { mouse } from './test-helpers.js'

const LEFT = 0
const MIDDLE = 1
const RIGHT = 2
const BACK = 3
const FORWARD = 4
const UNNAMED = 5

describe('formatMouseParts', () => {
  test('shows each button by its name', () => {
    expect(formatMouseParts('Click')).toEqual(['Click'])
    expect(formatMouseParts('RightClick')).toEqual(['Right'])
    expect(formatMouseParts('MiddleClick')).toEqual(['Middle'])
    expect(formatMouseParts('Back')).toEqual(['Back'])
  })

  test('shows modifiers, $mod as Ctrl off a Mac', () => {
    expect(formatMouseParts('ctrl+Click')).toEqual(['Ctrl', 'Click'])
    expect(formatMouseParts('alt+RightClick')).toEqual(['Alt', 'Right'])
    expect(formatMouseParts('$mod+Click')).toEqual(['Ctrl', 'Click'])
    expect(formatMouseParts('ctrl+ForwardClick')).toEqual(['Ctrl', 'Forward'])
  })

  test('adds a Release part', () => {
    expect(formatMouseParts('MiddleClick:up')).toEqual(['Middle', 'Release'])
  })
})

describe('eventToMouseBindingString', () => {
  test('names each button', () => {
    expect(eventToMouseBindingString(mouse('mousedown', LEFT))).toBe('click')
    expect(eventToMouseBindingString(mouse('mousedown', MIDDLE))).toBe('middle')
    expect(eventToMouseBindingString(mouse('mousedown', RIGHT))).toBe('right')
    expect(eventToMouseBindingString(mouse('mousedown', BACK))).toBe('back')
    expect(eventToMouseBindingString(mouse('mousedown', FORWARD))).toBe('forward')
  })

  test('writes modifiers before the button', () => {
    expect(eventToMouseBindingString(mouse('mousedown', LEFT, { ctrlKey: true }))).toBe('$mod+click')
    expect(eventToMouseBindingString(mouse('mousedown', LEFT, { altKey: true, shiftKey: true }))).toBe(
      'alt+shift+click',
    )
  })

  test('gives a mouseup as a release', () => {
    expect(eventToMouseBindingString(mouse('mouseup', MIDDLE))).toBe('middle:up')
    expect(eventToMouseBindingString(mouse('mouseup', BACK))).toBe('back:up')
  })

  test('has nothing for a button no binding names', () => {
    expect(eventToMouseBindingString(mouse('mousedown', UNNAMED))).toBeUndefined()
  })
})

const DOWN = 1

/**
 * Records one mouse binding from what happens in the window
 * @param {boolean} release - Whether to record a release
 * @returns {Readonly<{ got: readonly string[], stop: () => void, target: Window }>} What was recorded, the
 *   window, and how to stop
 */
function recordOn(release) {
  /** @type {string[]} */
  const got = []
  const target = globalThis.window
  const { record } = mouseUI()
  const stop = record?.({ ignore: () => false, release, target }, (binding) => {
    got.push(binding)
  })
  return { got, stop: stop ?? (() => undefined), target }
}

describe('recording a mouse binding', () => {
  test('takes the next click on its target, keeping it from anything else', () => {
    const { got, stop, target } = recordOn(false)
    const click = mouse('mousedown', MIDDLE, { ctrlKey: true })
    target.dispatchEvent(click)
    expect(got).toEqual(['$mod+middle'])
    expect(click.defaultPrevented).toBe(true)
    stop()
  })

  test('with a release, waits for the same button to come up', () => {
    const { got, stop, target } = recordOn(true)
    target.dispatchEvent(mouse('mousedown', MIDDLE))
    target.dispatchEvent(mouse('mouseup', LEFT))
    expect(got).toEqual([])
    target.dispatchEvent(mouse('mouseup', MIDDLE))
    expect(got).toEqual(['middle:up'])
    stop()
  })

  test('takes a scroll, which has no release', () => {
    const scrolling = recordOn(false)
    scrolling.target.dispatchEvent(new WheelEvent('wheel', { cancelable: true, deltaY: DOWN }))
    expect(scrolling.got).toEqual(['scrolldown'])
    scrolling.stop()
    const releasing = recordOn(true)
    releasing.target.dispatchEvent(new WheelEvent('wheel', { cancelable: true, deltaY: DOWN }))
    expect(releasing.got).toEqual([])
    releasing.stop()
  })

  test('hears nothing once stopped', () => {
    const { got, stop, target } = recordOn(false)
    stop()
    target.dispatchEvent(mouse('mousedown', LEFT))
    expect(got).toEqual([])
  })
})
