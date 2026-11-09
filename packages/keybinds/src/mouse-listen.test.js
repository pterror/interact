import { afterEach, describe, expect, mock, test } from 'bun:test'

import { keybinds } from './keybinds.js'
import { isMac } from './modifiers.js'
import { kbd, notes } from './test-keys.js'

const LEFT = 0
const MIDDLE = 1
const BACK = 3
const FORWARD = 4
const UNNAMED = 5
const LEFT_DOWN = 1
const MIDDLE_DOWN = 4
const LEFT_AND_MIDDLE_DOWN = 5

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

/**
 * keybinds() on a fresh element, stopped after the test
 * @param {Parameters<typeof keybinds>[0]} bindings - The bindings
 * @param {Parameters<typeof keybinds>[1]} [options] - More options
 * @returns {HTMLElement} The element
 */
function listen(bindings, options = {}) {
  const target = document.createElement('div')
  cleanups.push(keybinds(bindings, { releases: true, target, ...options }))
  return target
}

/**
 * Whether each event was cancelled, dispatched in order
 * @param {EventTarget} target - Where
 * @param {readonly Event[]} events - The events
 * @returns {readonly boolean[]} Whether each was
 */
function cancelled(target, events) {
  for (const event of events) {
    target.dispatchEvent(event)
  }
  return events.map((event) => event.defaultPrevented)
}

/**
 * A side button's press, release and auxclick
 * @param {number} button - Back or forward
 * @returns {readonly MouseEvent[]} The events
 */
function sideClick(button) {
  return [mouse('mousedown', button), mouse('mouseup', button), mouse('auxclick', button)]
}

/**
 * The middle button's press and release bound, noting each run
 * @returns {Readonly<{ log: readonly string[], target: HTMLElement }>} What ran, and where to click
 */
function middle() {
  const log = notes()
  const target = listen([{ mouse: ['MiddleClick', 'MiddleClick:up'], run: log.as('m') }])
  return { log: log.entries, target }
}

describe('mouse buttons', () => {
  test('run their bindings with their modifiers, back and forward too', () => {
    const [click, back, forward] = [mock(() => undefined), mock(() => undefined), mock(() => undefined)]
    const target = listen([
      { mouse: ['$mod+Click'], run: click },
      { mouse: ['Back'], run: back },
      { mouse: ['ForwardClick'], run: forward },
    ])
    const own = isMac ? { metaKey: true } : { ctrlKey: true }
    cancelled(target, [mouse('mousedown', LEFT), mouse('mousedown', LEFT, { ...own, shiftKey: true })])
    cancelled(target, [mouse('mousedown', LEFT, own), mouse('mousedown', BACK), mouse('mousedown', FORWARD)])
    expect([click.mock.calls.length, back.mock.calls.length, forward.mock.calls.length]).toEqual([1, 1, 1])
  })

  test('beyond the named five are left alone, not taken for a click', () => {
    const click = mock(() => undefined)
    const target = listen([{ mouse: ['Click'], run: click }])
    cancelled(target, [mouse('mousedown', UNNAMED), mouse('mousedown', LEFT)])
    expect(click).toHaveBeenCalledTimes(1)
  })

  test('run nothing once listening stops', () => {
    const click = mock(() => undefined)
    const target = document.createElement('div')
    keybinds([{ mouse: ['Click'], run: click }], { target })()
    target.dispatchEvent(mouse('mousedown', LEFT))
    expect(click).not.toHaveBeenCalled()
  })
})

describe('side buttons', () => {
  test("don't navigate while a press runs a binding: mousedown, mouseup and auxclick are cancelled", () => {
    const target = listen([{ mouse: ['Back'], run: () => undefined }])
    expect(cancelled(target, sideClick(BACK))).toEqual([true, true, true])
  })

  test('are left alone when nothing ran', () => {
    const target = listen([{ mouse: ['Back'], run: () => undefined, when: () => false }])
    expect(cancelled(target, sideClick(BACK))).toEqual([false, false, false])
  })

  test('with a release binding alone have their mouseup and auxclick cancelled', () => {
    const target = listen([{ mouse: ['Forward:up'], run: () => undefined }])
    expect(cancelled(target, sideClick(FORWARD)).slice(1)).toEqual([true, true])
  })

  test("don't carry a cancelled auxclick over to the next press", () => {
    let on = true
    const target = listen([{ mouse: ['Back'], run: () => undefined, when: () => on }])
    cancelled(target, [mouse('mousedown', BACK), mouse('mouseup', BACK)])
    on = false
    expect(cancelled(target, [mouse('mousedown', BACK), mouse('auxclick', BACK)])).toEqual([false, false])
  })
})

describe('mouse buttons held', () => {
  test('stay held when the window loses focus, released only by their mouseup', () => {
    const { log, target } = middle()
    target.dispatchEvent(mouse('mousedown', MIDDLE, { buttons: MIDDLE_DOWN }))
    globalThis.dispatchEvent(new Event('blur'))
    target.dispatchEvent(mouse('mousemove', LEFT, { buttons: MIDDLE_DOWN }))
    expect(log).toEqual(['m:mousedown'])
    target.dispatchEvent(mouse('mouseup', MIDDLE))
    expect(log).toEqual(['m:mousedown', 'm:mouseup'])
  })

  test('are released by the next mouse event when let go out of sight', () => {
    const { log, target } = middle()
    cancelled(target, [mouse('mousedown', MIDDLE, { buttons: MIDDLE_DOWN }), mouse('mousemove', LEFT)])
    expect(log).toEqual(['m:mousedown', 'm:mouseup'])
  })

  test("aren't released by another button going down and up", () => {
    const { log, target } = middle()
    cancelled(target, [
      mouse('mousedown', MIDDLE, { buttons: MIDDLE_DOWN }),
      mouse('mousedown', LEFT, { buttons: LEFT_AND_MIDDLE_DOWN }),
      mouse('mouseup', LEFT, { buttons: MIDDLE_DOWN }),
    ])
    expect(log).toEqual(['m:mousedown'])
  })

  test('are kept apart from keys, which the window losing focus releases', () => {
    const log = notes()
    const target = listen([{ keys: ['w', 'w:up'], mouse: ['Click', 'Click:up'], run: log.as('fire') }])
    target.dispatchEvent(mouse('mousedown', LEFT, { buttons: LEFT_DOWN }))
    target.dispatchEvent(kbd('keydown', { code: 'KeyW', key: 'w' }))
    globalThis.dispatchEvent(new Event('blur'))
    expect(log.entries).toEqual(['fire:mousedown', 'fire:keydown', 'fire:keyup'])
  })
})

const NOTCH = 100
const TRACKPAD_DELTA = 12
const TRACKPAD_EVENTS = 10
const LINES = 1
const SHORT_IDLE = 30
const LONGER = 60
const HALF_STEP = 40
const MORE_THAN_A_STEP = 60

/**
 * A wheel event that can be cancelled. happy-dom's WheelEvent ignores modifier keys, so these bind plain scrolling
 * @param {number} deltaY - How far it scrolls down
 * @param {number} [deltaMode] - In px, lines or pages
 * @returns {WheelEvent} The event
 */
function wheel(deltaY, deltaMode = 0) {
  return new WheelEvent('wheel', { cancelable: true, deltaMode, deltaY })
}

/**
 * One scroll-down binding on a fresh element
 * @param {() => unknown} run - What it runs
 * @param {Readonly<{ idle?: number }>} [options] - How scrolling steps
 * @returns {HTMLElement} The element
 */
function zoom(run, options = {}) {
  return listen([{ mouse: ['scrolldown'], run: () => (run() === false ? false : undefined) }], { wheel: options })
}

describe('scrolling', () => {
  test('runs once per mouse-wheel notch', () => {
    const run = mock(() => undefined)
    zoom(run).dispatchEvent(wheel(NOTCH))
    expect(run).toHaveBeenCalledTimes(1)
  })

  test("adds up a trackpad's small deltas to a step, the page held still in between", () => {
    const run = mock(() => undefined)
    const target = zoom(run)
    const events = Array.from({ length: TRACKPAD_EVENTS }, () => wheel(TRACKPAD_DELTA))
    expect([cancelled(target, events).every(Boolean), run.mock.calls.length]).toEqual([true, 2])
  })

  test('counts lines as px', () => {
    const run = mock(() => undefined)
    const target = zoom(run)
    target.dispatchEvent(wheel(3, LINES))
    expect(run).not.toHaveBeenCalled()
    target.dispatchEvent(wheel(1, LINES))
    expect(run).toHaveBeenCalledTimes(1)
  })

  test('leaves a scroll nothing bound applies to to the page', () => {
    const target = listen([{ mouse: ['scrollup'], run: () => undefined, when: () => false }])
    expect(cancelled(target, [wheel(-TRACKPAD_DELTA), wheel(NOTCH)])).toEqual([false, false])
  })

  test('starts a new gesture after a pause', async () => {
    const run = mock(() => undefined)
    const target = zoom(run, { idle: SHORT_IDLE })
    target.dispatchEvent(wheel(HALF_STEP))
    await Bun.sleep(LONGER)
    target.dispatchEvent(wheel(HALF_STEP))
    expect(run).not.toHaveBeenCalled()
  })

  test('gives the rest of the gesture to the page when a binding returns false', () => {
    const run = mock(() => false)
    const target = zoom(run)
    target.dispatchEvent(wheel(MORE_THAN_A_STEP))
    const later = wheel(MORE_THAN_A_STEP)
    target.dispatchEvent(later)
    expect([run.mock.calls.length, later.defaultPrevented]).toEqual([1, false])
  })
})
