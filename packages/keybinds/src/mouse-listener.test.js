/** @import { Command } from './command.js' */

import { describe, expect, mock, test } from 'bun:test'

import { kbd, keybinds, mouse, recording } from './test-helpers.js'

const LEFT = 0
const MIDDLE = 1
const BACK = 3
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
