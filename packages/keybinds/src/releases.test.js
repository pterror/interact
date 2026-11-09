/** @import { Command } from './command.js' */

import { describe, expect, mock, test } from 'bun:test'

import { accepts, kbd, keybinds, mouse, recording } from './test-helpers.js'
import { ALL } from './test-inputs.js'

const ONCE = 1
const MIDDLE = 1
const FIRST = 0
const EVERY_OTHER = 2

/**
 * K going down, as a fresh event
 * @returns {KeyboardEvent} The keydown
 */
function kDown() {
  return kbd('keydown', { code: 'KeyK', key: 'k' })
}

/**
 * K coming up, as a fresh event
 * @returns {KeyboardEvent} The keyup
 */
function kUp() {
  return kbd('keyup', { code: 'KeyK', key: 'k' })
}

/**
 * A log of which command ran on which event, in order
 * @returns {Readonly<{ as: (name: string) => Command['execute'], entries: readonly string[] }>} An action that logs
 *   as a name, and the log
 */
function log() {
  /** @type {string[]} */
  const entries = []
  return {
    as: (name) => (_context, event) => {
      entries.push(`${name}:${event?.type ?? 'no event'}`)
    },
    entries,
  }
}

/**
 * A command with key bindings
 * @param {readonly string[]} keys - Its bindings
 * @param {Partial<Command>} [fields] - More of it
 * @returns {Command} The command
 */
function command(keys, fields = {}) {
  return { execute: () => undefined, id: 'k', keys, label: 'K', ...fields }
}

/**
 * Listens on a fresh element
 * @param {readonly Command[]} commands - The commands
 * @returns {Readonly<{ stop: () => void, target: HTMLElement }>} The element, and how to stop
 */
function listening(commands) {
  const target = document.createElement('div')
  return { stop: keybinds(commands, undefined, { target }), target }
}

describe('release bindings', () => {
  test('fire when a pressed key comes up, once per press', () => {
    const up = mock(() => undefined)
    const { stop, target } = listening([command(['k:up'], { execute: up })])
    target.dispatchEvent(kDown())
    expect(up).not.toHaveBeenCalled()
    target.dispatchEvent(kUp())
    target.dispatchEvent(kUp())
    expect(up).toHaveBeenCalledTimes(ONCE)
    stop()
  })
})

describe('release bindings and presses', () => {
  test('are bindings of their own, apart from presses', () => {
    const open = mock(() => undefined)
    const close = mock(() => undefined)
    const { stop, target } = listening([
      { execute: open, id: 'o', label: 'O', mouse: ['MiddleClick'] },
      { execute: close, id: 'c', label: 'C', mouse: ['MiddleClick:up'] },
    ])
    target.dispatchEvent(mouse('mousedown', MIDDLE))
    expect([open.mock.calls.length, close.mock.calls.length]).toEqual([ONCE, ONCE - ONCE])
    target.dispatchEvent(mouse('mouseup', MIDDLE))
    expect([open.mock.calls.length, close.mock.calls.length]).toEqual([ONCE, ONCE])
    stop()
  })

  test('do not fire for a release whose press was never seen', () => {
    const key = mock(() => undefined)
    const button = mock(() => undefined)
    const { stop, target } = listening([
      command(['k:up'], { execute: key }),
      { execute: button, id: 'm', label: 'M', mouse: ['middle:up'] },
    ])
    target.dispatchEvent(kUp())
    target.dispatchEvent(mouse('mouseup', MIDDLE))
    expect([key.mock.calls.length, button.mock.calls.length]).toEqual([ONCE - ONCE, ONCE - ONCE])
    stop()
  })

  test('match the modifiers held when the key went down', () => {
    const up = mock(() => undefined)
    const { stop, target } = listening([command(['ctrl+k:up'], { execute: up })])
    target.dispatchEvent(kbd('keydown', { code: 'KeyK', ctrlKey: true, key: 'k' }))
    target.dispatchEvent(kUp())
    expect(up).toHaveBeenCalledTimes(ONCE)
    target.dispatchEvent(kDown())
    target.dispatchEvent(kbd('keyup', { code: 'KeyK', ctrlKey: true, key: 'k' }))
    expect(up).toHaveBeenCalledTimes(ONCE)
    stop()
  })
})

describe('release bindings beside the rest', () => {
  test('leave press bindings as they were', () => {
    const down = mock(() => undefined)
    const { stop, target } = listening([command(['k', 'k:up'], { execute: down })])
    target.dispatchEvent(kDown())
    expect(down).toHaveBeenCalledTimes(ONCE)
    stop()
  })

  test('stop with the rest', () => {
    const up = mock(() => undefined)
    const { stop, target } = listening([command(['k:up'], { execute: up })])
    target.dispatchEvent(kDown())
    stop()
    target.dispatchEvent(kUp())
    expect(up).not.toHaveBeenCalled()
  })
})

describe('releases and when', () => {
  test('a release-only command checks its own when as the key comes up', () => {
    const up = mock(() => undefined)
    let on = true
    const { stop, target } = listening([command(['k:up'], { execute: up, when: () => on })])
    target.dispatchEvent(kDown())
    on = false
    target.dispatchEvent(kUp())
    expect(up).not.toHaveBeenCalled()
    stop()
  })

  test('a command whose press fired always gets its release, even once its when is false', () => {
    const fired = recording()
    let on = true
    const hold = command(['space', 'space:up'], {
      execute: fired.execute,
      mouse: ['middle', 'middle:up'],
      when: () => on,
    })
    const { stop, target } = listening([hold])
    const steps = [
      () => kbd('keydown', { code: 'Space', key: ' ' }),
      () => kbd('keyup', { code: 'Space', key: ' ' }),
      () => mouse('mousedown', MIDDLE),
      () => mouse('mouseup', MIDDLE),
    ]
    for (const [index, step] of steps.entries()) {
      on = index % EVERY_OTHER === FIRST
      target.dispatchEvent(step())
    }
    expect(fired.types).toEqual(['keydown', 'keyup', 'mousedown', 'mouseup'])
    stop()
  })
})

describe('releases a press fired for', () => {
  test('come even when another command takes the release first', () => {
    const order = log()
    const other = command(['k:up'], { execute: order.as('other'), id: 'other' })
    const hold = command(['k', 'k:up'], { execute: order.as('hold') })
    const { stop, target } = listening([other, hold])
    target.dispatchEvent(kDown())
    target.dispatchEvent(kUp())
    expect(order.entries).toEqual(['hold:keydown', 'other:keyup', 'hold:keyup'])
    stop()
  })

  test('a held key repeating does not change which commands fired', () => {
    const fired = recording()
    let on = true
    const { stop, target } = listening([command(['k', 'k:up'], { execute: fired.execute, when: () => on })])
    target.dispatchEvent(kDown())
    on = false
    target.dispatchEvent(kbd('keydown', { code: 'KeyK', key: 'k', repeat: true }))
    target.dispatchEvent(kUp())
    expect(fired.types).toEqual(['keydown', 'keyup'])
    stop()
  })
})

describe('releases in text fields and in validation', () => {
  test('skip text fields unless the command captures input, but a press that fired still gets its release', () => {
    const plain = mock(() => undefined)
    const fired = recording()
    const field = document.createElement('input')
    const { stop, target } = listening([
      command(['j:up'], { execute: plain, id: 'plain' }),
      command(['k', 'k:up'], { captureInput: true, execute: fired.execute }),
    ])
    target.append(field)
    for (const key of ['j', 'k']) {
      field.dispatchEvent(kbd('keydown', { code: `Key${key.toUpperCase()}`, key }))
      field.dispatchEvent(kbd('keyup', { code: `Key${key.toUpperCase()}`, key }))
    }
    expect([plain.mock.calls.length, fired.types]).toEqual([ONCE - ONCE, ['keydown', 'keyup']])
    stop()
  })

  test('accept ":up" on keys and buttons, but not on scrolling or alone', () => {
    const valid = command(['ctrl+k:up', 'Escape:UP'], { mouse: ['middle:up'] })
    expect(accepts([valid], ALL)).toBe(true)
    expect(() => accepts([{ ...command([]), mouse: ['scrollup:up'] }], ALL)).toThrow('scroll')
    expect(() => accepts([command([':up'])], ALL)).toThrow('Invalid key binding')
    expect(() => accepts([command(['ctrl+:up'])], ALL)).toThrow('no key (only modifiers)')
  })
})
