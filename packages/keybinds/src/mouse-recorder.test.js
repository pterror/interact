import { describe, expect, test } from 'bun:test'

import { mouseUI } from './mouse-ui.js'
import { mouse } from './test-helpers.js'

const LEFT = 0
const MIDDLE = 1
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
