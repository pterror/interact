import { describe, expect, mock, test } from 'bun:test'

import { kbd, keybinds, mouse, recording } from './test-helpers.js'

const ONCE = 1
const THRICE = 3
const LEFT = 0
const SCROLL = 100

describe('anyModifiers', () => {
  test('lets a binding fire whatever other modifiers are held', () => {
    const execute = mock(() => undefined)
    const target = document.createElement('div')
    const stop = keybinds([{ anyModifiers: true, execute, id: 'w', keys: ['w'], label: 'W' }], undefined, { target })
    target.dispatchEvent(kbd('keydown', { code: 'KeyW', key: 'w' }))
    target.dispatchEvent(kbd('keydown', { code: 'KeyW', key: 'W', shiftKey: true }))
    target.dispatchEvent(kbd('keydown', { altKey: true, code: 'KeyW', ctrlKey: true, key: 'w' }))
    expect(execute).toHaveBeenCalledTimes(THRICE)
    stop()
  })

  test("still requires a binding's own modifiers", () => {
    const execute = mock(() => undefined)
    const target = document.createElement('div')
    const command = { anyModifiers: true, execute, id: 'x', keys: ['shift+x'], label: 'X' }
    const stop = keybinds([command], undefined, { target })
    target.dispatchEvent(kbd('keydown', { code: 'KeyX', key: 'x' }))
    expect(execute).not.toHaveBeenCalled()
    target.dispatchEvent(kbd('keydown', { code: 'KeyX', ctrlKey: true, key: 'X', shiftKey: true }))
    expect(execute).toHaveBeenCalledTimes(ONCE)
    stop()
  })

  test('lets an exact binding win', () => {
    const loose = mock(() => undefined)
    const exact = mock(() => undefined)
    const target = document.createElement('div')
    const commands = [
      { anyModifiers: true, execute: loose, id: 'loose', keys: ['x'], label: 'Loose' },
      { execute: exact, id: 'exact', keys: ['shift+x'], label: 'Exact' },
    ]
    const stop = keybinds(commands, undefined, { target })
    target.dispatchEvent(kbd('keydown', { code: 'KeyX', key: 'X', shiftKey: true }))
    expect([exact.mock.calls.length, loose.mock.calls.length]).toEqual([ONCE, ONCE - ONCE])
    target.dispatchEvent(kbd('keydown', { code: 'KeyX', ctrlKey: true, key: 'x' }))
    expect(loose).toHaveBeenCalledTimes(ONCE)
    stop()
  })
})

describe('anyModifiers, beyond keys', () => {
  test('gives a hold started with a modifier down its release', () => {
    const fired = recording()
    const target = document.createElement('div')
    const command = { anyModifiers: true, execute: fired.execute, id: 'fwd', keys: ['w', 'w:up'], label: 'Forward' }
    const stop = keybinds([command], undefined, { target })
    target.dispatchEvent(kbd('keydown', { code: 'KeyW', key: 'W', shiftKey: true }))
    target.dispatchEvent(kbd('keyup', { code: 'KeyW', key: 'w' }))
    expect(fired.types).toEqual(['keydown', 'keyup'])
    stop()
  })

  test('covers mouse buttons and scrolling too', () => {
    const click = mock(() => undefined)
    const scroll = mock(() => undefined)
    const target = document.createElement('div')
    const commands = [
      { anyModifiers: true, execute: click, id: 'c', label: 'C', mouse: ['Click'] },
      { anyModifiers: true, execute: scroll, id: 's', label: 'S', mouse: ['scrolldown'] },
    ]
    const stop = keybinds(commands, undefined, { target })
    target.dispatchEvent(mouse('mousedown', LEFT, { shiftKey: true }))
    target.dispatchEvent(new WheelEvent('wheel', { cancelable: true, ctrlKey: true, deltaY: SCROLL }))
    expect([click.mock.calls.length, scroll.mock.calls.length]).toEqual([ONCE, ONCE])
    stop()
  })

  test('leaves other bindings matching modifiers exactly', () => {
    const execute = mock(() => undefined)
    const target = document.createElement('div')
    const stop = keybinds([{ execute, id: 'w', keys: ['w'], label: 'W' }], undefined, { target })
    target.dispatchEvent(kbd('keydown', { code: 'KeyW', key: 'W', shiftKey: true }))
    expect(execute).not.toHaveBeenCalled()
    stop()
  })
})
