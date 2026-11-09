import { describe, expect, mock, test } from 'bun:test'

import { keybinds } from './keybinds.js'
import { listening, nothing } from './test-keys.js'

const TIMEOUT = 20
const TOO_LONG = 40

describe('sequences', () => {
  test('run on their last step, and earlier steps are theirs', () => {
    const run = mock(() => undefined)
    const keys = listening([{ keys: ['g i'], run }], { sequences: true })
    expect(keys.tap('g').defaultPrevented).toBe(true)
    expect(run).not.toHaveBeenCalled()
    keys.tap('i')
    keys.tap('i')
    expect(run).toHaveBeenCalledTimes(1)
    keys.stop()
  })

  test('have steps with modifiers, and a double tap is the same key twice', () => {
    const save = mock(() => undefined)
    const twice = mock(() => undefined)
    const keys = listening(
      [
        { keys: ['ctrl+k ctrl+s'], run: save },
        { keys: ['j j'], run: twice },
      ],
      { sequences: true },
    )
    keys.tap('k', { ctrlKey: true })
    keys.tap('s', { ctrlKey: true })
    keys.tap('j')
    keys.tap('j')
    expect([save.mock.calls.length, twice.mock.calls.length]).toEqual([1, 1])
    keys.stop()
  })

  test('let a press that does not go on from the steps so far be a press of its own', () => {
    const inbox = mock(() => undefined)
    const other = mock(() => undefined)
    const keys = listening(
      [
        { keys: ['g i'], run: inbox },
        { keys: ['x'], run: other },
      ],
      { sequences: true },
    )
    keys.tap('g')
    keys.tap('x')
    keys.tap('i')
    expect([other.mock.calls.length, inbox.mock.calls.length]).toEqual([1, 0])
    keys.stop()
  })

  test('need the next step within the timeout', async () => {
    const run = mock(() => undefined)
    const keys = listening([{ keys: ['g i'], run }], { sequences: { timeout: TIMEOUT } })
    keys.tap('g')
    await Bun.sleep(TOO_LONG)
    keys.tap('i')
    expect(run).not.toHaveBeenCalled()
    keys.stop()
  })
})

describe('sequences with other keys', () => {
  test('carry on through Shift pressed between steps', () => {
    const run = mock(() => undefined)
    const keys = listening([{ keys: ['g shift+g'], run }], { sequences: true })
    keys.tap('g')
    keys.down('Shift', { code: 'ShiftLeft', shiftKey: true })
    keys.tap('G', { code: 'KeyG', shiftKey: true })
    expect(run).toHaveBeenCalledTimes(1)
    keys.stop()
  })

  test("don't take their first step while their bindings don't apply", () => {
    const keys = listening([{ keys: ['g i'], run: () => undefined, when: () => false }], { sequences: true })
    expect(keys.tap('g').defaultPrevented).toBe(false)
    keys.stop()
  })

  test("leave a last step to the key's own binding when theirs doesn't apply", () => {
    const own = mock(() => undefined)
    let on = true
    const keys = listening(
      [
        { keys: ['g i'], run: () => undefined, when: () => on },
        { keys: ['i'], run: own },
      ],
      { sequences: true },
    )
    keys.tap('g')
    on = false
    keys.tap('i')
    expect(own).toHaveBeenCalledTimes(1)
    keys.stop()
  })

  test("swallow a step's auto-repeat", () => {
    const keys = listening([{ keys: ['g i'], run: () => undefined }], { sequences: true })
    keys.down('g')
    expect(keys.down('g', { repeat: true }).defaultPrevented).toBe(true)
    keys.up('g')
    keys.stop()
  })

  test('cannot start with a step that is a binding of its own, nor be used without the sequences option', () => {
    const run = nothing
    expect(() =>
      keybinds(
        [
          { keys: ['g'], run },
          { keys: ['g i'], run },
        ],
        { sequences: true },
      ),
    ).toThrow('both a binding and the start of a sequence')
    expect(() => keybinds([{ keys: ['g i'], run }])).toThrow('needs the sequences option')
    expect(() => keybinds([{ keys: ['g i:up'], run }], { releases: true, sequences: true })).toThrow(
      "a sequence can't end",
    )
    expect(() => keybinds([{ anyModifiers: true, keys: ['g i'], run }], { sequences: true })).toThrow(
      "can't match any modifiers",
    )
  })
})
