import { describe, expect, mock, test } from 'bun:test'

import { keybinds } from './keybinds.js'
import { kbd, listening, nothing, notes } from './test-keys.js'

describe('keybinds', () => {
  test('runs the binding bound to a key, and only that one', () => {
    const run = mock(() => undefined)
    const keys = listening([{ keys: ['ctrl+s'], run }])
    keys.down('a', { ctrlKey: true })
    expect(run).not.toHaveBeenCalled()
    keys.down('s', { ctrlKey: true })
    expect(run).toHaveBeenCalledTimes(1)
    keys.stop()
  })

  test("skips bindings that don't apply, and stops listening when told", () => {
    const off = mock(() => undefined)
    const on = mock(() => undefined)
    const keys = listening([
      { keys: ['ctrl+x'], run: off, when: () => false },
      { keys: ['ctrl+s'], run: on },
    ])
    keys.down('x', { ctrlKey: true })
    keys.stop()
    keys.down('s', { ctrlKey: true })
    expect([off.mock.calls.length, on.mock.calls.length]).toEqual([0, 0])
  })

  test('runs no binding while text is typed into a field, unless it runs while typing', () => {
    const plain = mock(() => undefined)
    const typing = mock(() => undefined)
    const keys = listening([
      { keys: ['a'], run: plain },
      { keys: ['escape'], run: typing, typing: true },
    ])
    const field = document.createElement('input')
    keys.target.append(field)
    field.dispatchEvent(kbd('keydown', { code: 'KeyA', key: 'a' }))
    field.dispatchEvent(kbd('keydown', { code: 'Escape', key: 'Escape' }))
    expect([plain.mock.calls.length, typing.mock.calls.length]).toEqual([0, 1])
    keys.stop()
  })

  test('throws for a binding to an unknown key, to modifiers only, or to several keys', () => {
    const run = nothing
    expect(() => keybinds([{ keys: ['$mod+banana'], run }])).toThrow('Unknown key "banana"')
    expect(() => keybinds([{ keys: ['$mod'], run }])).toThrow('no key (only modifiers)')
    expect(() => keybinds([{ keys: ['a+b'], run }])).toThrow('multiple keys')
  })

  test('throws for a mouse or gamepad binding it cannot read, naming it', () => {
    expect(() => keybinds([{ mouse: ['wheel'], run: nothing }])).toThrow('Unknown mouse button "wheel"')
    expect(() => keybinds([{ pad: ['z'], run: nothing }])).toThrow('Unknown gamepad button "z"')
  })
})

describe('the capture phase', () => {
  test('lets a bound key reach its binding before the element it was typed in', () => {
    const inner = document.createElement('div')
    /** @type {boolean[]} */
    const editor = []
    inner.addEventListener('keydown', (event) => {
      editor.push(event.defaultPrevented)
    })
    const bold = mock(() => undefined)
    const keys = listening([{ keys: ['ctrl+b'], run: bold }], { capture: true })
    keys.target.append(inner)
    inner.dispatchEvent(kbd('keydown', { code: 'KeyB', ctrlKey: true, key: 'b' }))
    expect([bold.mock.calls.length, editor]).toEqual([1, []])
    keys.stop()
  })

  test('lets a key no binding that applies takes still reach the element', () => {
    const inner = document.createElement('div')
    const editor = mock(() => undefined)
    inner.addEventListener('keydown', editor)
    const keys = listening([{ keys: ['ctrl+b'], run: () => undefined, when: () => false }], { capture: true })
    keys.target.append(inner)
    inner.dispatchEvent(kbd('keydown', { code: 'KeyB', ctrlKey: true, key: 'b' }))
    expect(editor).toHaveBeenCalledTimes(1)
    keys.stop()
  })
})

describe('anyModifiers', () => {
  test('lets a binding run whatever other modifiers are held', () => {
    const run = mock(() => undefined)
    const keys = listening([{ anyModifiers: true, keys: ['w'], run }])
    keys.down('w')
    keys.down('W', { code: 'KeyW', shiftKey: true })
    keys.down('w', { altKey: true, ctrlKey: true })
    expect(run).toHaveBeenCalledTimes(3)
    keys.stop()
  })

  test("still requires a binding's own modifiers", () => {
    const run = mock(() => undefined)
    const keys = listening([{ anyModifiers: true, keys: ['shift+x'], run }])
    keys.down('x')
    expect(run).not.toHaveBeenCalled()
    keys.down('X', { code: 'KeyX', ctrlKey: true, shiftKey: true })
    expect(run).toHaveBeenCalledTimes(1)
    keys.stop()
  })

  test('lets an exact binding come first', () => {
    const loose = mock(() => undefined)
    const exact = mock(() => undefined)
    const keys = listening([
      { anyModifiers: true, keys: ['x'], run: loose },
      { keys: ['shift+x'], run: exact },
    ])
    keys.down('X', { code: 'KeyX', shiftKey: true })
    expect([exact.mock.calls.length, loose.mock.calls.length]).toEqual([1, 0])
    keys.down('x', { ctrlKey: true })
    expect(loose).toHaveBeenCalledTimes(1)
    keys.stop()
  })

  test('gives a press started with a modifier down its release', () => {
    const log = notes()
    const keys = listening([{ anyModifiers: true, keys: ['w', 'w:up'], run: log.as('w') }], {
      releases: true,
    })
    keys.down('W', { code: 'KeyW', shiftKey: true })
    keys.up('w')
    expect(log.entries).toEqual(['w:keydown', 'w:keyup'])
    keys.stop()
  })

  test('leaves other bindings matching modifiers exactly', () => {
    const run = mock(() => undefined)
    const keys = listening([{ keys: ['w'], run }])
    keys.down('W', { code: 'KeyW', shiftKey: true })
    expect(run).not.toHaveBeenCalled()
    keys.stop()
  })
})
