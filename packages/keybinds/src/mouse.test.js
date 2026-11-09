/**
 * @import { Command } from './command.js'
 */

import { describe, expect, mock, test } from 'bun:test'

import { findConflict } from './binding.js'
import { mouseMatches, parseMouse, wheelDirection } from './mouse.js'
import { accepts, kbd, keybinds, mouse, recording } from './test-helpers.js'
import { ALL, INPUT } from './test-inputs.js'

const LEFT = 0
const MIDDLE = 1
const BACK = 3

/**
 * A command bound to mouse bindings, doing nothing
 * @param {readonly string[]} bindings - Its mouse bindings
 * @param {boolean} [anyModifiers] - Whether they match whatever else is held
 * @returns {Command} The command
 */
function bound(bindings, anyModifiers = false) {
  return { anyModifiers, execute: () => false, id: 'c', label: 'C', mouse: bindings }
}

describe('parseMouse', () => {
  test('reads every name for a button as one button', () => {
    expect(parseMouse('LeftClick').button).toBe('click')
    expect(parseMouse('ctrl+BackClick')).toEqual({
      button: 'back',
      mods: { alt: false, ctrl: true, meta: false, shift: false },
    })
    expect(() =>
      accepts([{ execute: () => false, id: 'x', label: 'X', mouse: ['Back', 'forward', 'ctrl+BackClick'] }], ALL),
    ).not.toThrow()
  })

  test('rejects what names no button, and a scroll with a suffix', () => {
    expect(() => parseMouse('ctrl')).toThrow('no button')
    expect(() => parseMouse('click+right')).toThrow('multiple buttons')
    expect(() => parseMouse('wheel')).toThrow('Unknown mouse button')
    expect(() => parseMouse('scrollup', ':up')).toThrow('Scroll has no ":up"')
  })

  test('finds conflicts between names for the same button only', () => {
    const schema = { history: { label: 'History', mouse: ['back'] } }
    expect(findConflict(schema, { binding: 'BackClick', input: INPUT.mouse })?.commandId).toBe('history')
    expect(findConflict(schema, { binding: 'scrollup', input: INPUT.mouse })).toBeUndefined()
    expect(findConflict(schema, { binding: 'forward', input: INPUT.mouse })).toBeUndefined()
  })
})

describe('mouseMatches', () => {
  test('is a press of a bound button with exactly its modifiers', () => {
    expect(mouseMatches(bound(['MiddleClick']), mouse('mousedown', MIDDLE))).toBe(true)
    expect(mouseMatches(bound(['MiddleClick']), mouse('mousedown', MIDDLE, { shiftKey: true }))).toBe(false)
    expect(mouseMatches(bound(['shift+Back']), mouse('mousedown', BACK, { shiftKey: true }))).toBe(true)
    expect(mouseMatches(bound(['MiddleClick']), mouse('mousedown', LEFT))).toBe(false)
  })

  test('leaves out releases and other modifiers only for anyModifiers commands', () => {
    expect(mouseMatches(bound(['MiddleClick:up']), mouse('mousedown', MIDDLE))).toBe(false)
    expect(mouseMatches(bound(['MiddleClick'], true), mouse('mousedown', MIDDLE, { shiftKey: true }))).toBe(true)
    expect(mouseMatches(bound(['alt+MiddleClick'], true), mouse('mousedown', MIDDLE, { shiftKey: true }))).toBe(false)
  })
})

const FORWARD = 4
const UNNAMED = 5
const UNNAMED_TOO = 7
const ONCE = 1
const NEVER = 0
const NO_BUTTONS = 0
const LEFT_DOWN = 1
const MIDDLE_DOWN = 4
const LEFT_AND_MIDDLE_DOWN = 5

/**
 * Listens for commands on a target of its own
 * @param {readonly Command[]} commands - The commands
 * @returns {Readonly<{ held: (id: string) => boolean, stop: () => void, target: HTMLElement }>} The target, whether a
 *   command is held, and how to stop
 */
function listen(commands) {
  const target = document.createElement('div')
  const listening = keybinds(commands, undefined, { target })
  return { held: listening.held, stop: listening, target }
}

/**
 * Whether each event was cancelled, dispatched in order on a target
 * @param {HTMLElement} target - Where
 * @param {readonly MouseEvent[]} events - The events
 * @returns {boolean[]} Whether each was cancelled
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
 * @returns {MouseEvent[]} The events, in order
 */
function sideClick(button) {
  return [mouse('mousedown', button), mouse('mouseup', button), mouse('auxclick', button)]
}

/**
 * A command bound to the middle button's press and release, noting each event it runs on
 * @returns {Readonly<{ command: Command, types: readonly string[] }>} The command, and what it noted
 */
function middlePressAndRelease() {
  const fired = recording()
  return {
    command: { execute: fired.execute, id: 'm', label: 'M', mouse: ['MiddleClick', 'MiddleClick:up'] },
    types: fired.types,
  }
}

describe('side buttons', () => {
  test('back and forward run their own bindings, not scrolling', () => {
    const [back, forward, scroll] = [mock(() => undefined), mock(() => undefined), mock(() => undefined)]
    const { stop, target } = listen([
      { execute: back, id: 'b', label: 'B', mouse: ['Back'] },
      { execute: forward, id: 'f', label: 'F', mouse: ['ForwardClick'] },
      { execute: scroll, id: 'u', label: 'U', mouse: ['scrollup', 'scrolldown'] },
    ])
    cancelled(target, [mouse('mousedown', BACK), mouse('mousedown', FORWARD)])
    expect([back.mock.calls.length, forward.mock.calls.length, scroll.mock.calls.length]).toEqual([ONCE, ONCE, NEVER])
    stop()
  })

  test('buttons beyond the named five are left alone, not taken for a click', () => {
    const click = mock(() => undefined)
    const { stop, target } = listen([{ execute: click, id: 'c', label: 'C', mouse: ['Click'] }])
    cancelled(target, [mouse('mousedown', UNNAMED), mouse('mousedown', UNNAMED_TOO)])
    expect(click).not.toHaveBeenCalled()
    target.dispatchEvent(mouse('mousedown', LEFT))
    expect(click).toHaveBeenCalledTimes(ONCE)
    stop()
  })

  test('while a press runs a command, its mousedown, mouseup and auxclick are cancelled', () => {
    const { stop, target } = listen([{ execute: () => undefined, id: 'b', label: 'B', mouse: ['Back'] }])
    expect(cancelled(target, sideClick(BACK))).toEqual([true, true, true])
    stop()
  })

  test('are left alone when nothing ran', () => {
    const { stop, target } = listen([
      { execute: () => undefined, id: 'b', label: 'B', mouse: ['Back'], when: () => false },
    ])
    expect(cancelled(target, sideClick(BACK))).toEqual([false, false, false])
    stop()
  })
})

describe('side buttons released', () => {
  test('a release binding alone cancels its mouseup and auxclick', () => {
    const { stop, target } = listen([{ execute: () => undefined, id: 'b', label: 'B', mouse: ['Forward:up'] }])
    const [, up, aux] = cancelled(target, sideClick(FORWARD))
    expect([up, aux]).toEqual([true, true])
    stop()
  })

  test("a cancelled auxclick doesn't carry over to the next press", () => {
    let active = true
    const { stop, target } = listen([
      { execute: () => undefined, id: 'b', label: 'B', mouse: ['Back'], when: () => active },
    ])
    cancelled(target, [mouse('mousedown', BACK), mouse('mouseup', BACK)])
    active = false
    expect(cancelled(target, [mouse('mousedown', BACK), mouse('auxclick', BACK)])).toEqual([false, false])
    stop()
  })
})

describe('mouse buttons held and released', () => {
  test('stay held when the window loses focus, unlike keys', () => {
    const { held, stop, target } = listen([
      { execute: () => undefined, id: 'fire', label: 'Fire', mouse: ['Click'] },
      { execute: () => undefined, id: 'fwd', keys: ['w'], label: 'Forward' },
    ])
    target.dispatchEvent(mouse('mousedown', LEFT, { buttons: LEFT_DOWN }))
    target.dispatchEvent(kbd('keydown', { code: 'KeyW', key: 'w' }))
    target.ownerDocument.defaultView?.dispatchEvent(new Event('blur'))
    expect([held('fire'), held('fwd')]).toEqual([true, false])
    target.dispatchEvent(mouse('mouseup', LEFT, { buttons: NO_BUTTONS }))
    expect(held('fire')).toBe(false)
    stop()
  })

  test('a button still down when the page next hears from the mouse is released only by its mouseup', () => {
    const { command, types } = middlePressAndRelease()
    const { stop, target } = listen([command])
    target.dispatchEvent(mouse('mousedown', MIDDLE, { buttons: MIDDLE_DOWN }))
    target.ownerDocument.defaultView?.dispatchEvent(new Event('blur'))
    target.dispatchEvent(mouse('mousemove', LEFT, { buttons: MIDDLE_DOWN }))
    expect(types).toEqual(['mousedown'])
    target.dispatchEvent(mouse('mouseup', MIDDLE, { buttons: NO_BUTTONS }))
    expect(types).toEqual(['mousedown', 'mouseup'])
    stop()
  })
})

describe('mouse buttons let go out of sight', () => {
  test('are released on the next mouse event', () => {
    const { command, types } = middlePressAndRelease()
    const { stop, target } = listen([command])
    cancelled(target, [
      mouse('mousedown', MIDDLE, { buttons: MIDDLE_DOWN }),
      mouse('mousemove', LEFT, { buttons: NO_BUTTONS }),
    ])
    expect(types).toEqual(['mousedown', 'mouseup'])
    stop()
  })

  test("aren't confused with another button going down and up", () => {
    const { command, types } = middlePressAndRelease()
    const { stop, target } = listen([command])
    cancelled(target, [
      mouse('mousedown', MIDDLE, { buttons: MIDDLE_DOWN }),
      mouse('mousedown', LEFT, { buttons: LEFT_AND_MIDDLE_DOWN }),
      mouse('mouseup', LEFT, { buttons: MIDDLE_DOWN }),
    ])
    expect(types).toEqual(['mousedown'])
    stop()
  })

  test('nothing runs once listening stops', () => {
    const click = mock(() => undefined)
    const { stop, target } = listen([{ execute: click, id: 'c', label: 'C', mouse: ['Click'] }])
    stop()
    target.dispatchEvent(mouse('mousedown', LEFT))
    expect(click).not.toHaveBeenCalled()
  })
})

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
