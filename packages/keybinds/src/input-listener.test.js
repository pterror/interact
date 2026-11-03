import { describe, expect, mock, test } from 'bun:test'

import { kbd, keybinds } from './test-helpers.js'

const ONCE = 1

/**
 * A key event that bubbles up from where it's typed
 * @param {string} type - "keydown" or "keyup"
 * @returns {KeyboardEvent} Ctrl+B
 */
function ctrlB(type) {
  return kbd(type, { code: 'KeyB', ctrlKey: true, key: 'b' })
}

describe('held', () => {
  test('a command is held from its press until its key comes up, repeats and all', () => {
    const target = document.createElement('div')
    const listening = keybinds([{ execute: () => undefined, id: 'fwd', keys: ['w'], label: 'Forward' }], undefined, {
      target,
    })
    expect(listening.held('fwd')).toBe(false)
    target.dispatchEvent(kbd('keydown', { code: 'KeyW', key: 'w' }))
    expect(listening.held('fwd')).toBe(true)
    target.dispatchEvent(kbd('keydown', { code: 'KeyW', key: 'w', repeat: true }))
    expect(listening.held('fwd')).toBe(true)
    target.dispatchEvent(kbd('keyup', { code: 'KeyW', key: 'w' }))
    expect(listening.held('fwd')).toBe(false)
    listening()
  })

  test("a press that didn't fire (inactive, or passed on) isn't held", () => {
    const target = document.createElement('div')
    const commands = [
      { execute: () => undefined, id: 'off', keys: ['a'], label: 'Off', when: () => false },
      { execute: () => false, id: 'pass', keys: ['b'], label: 'Pass' },
    ]
    const listening = keybinds(commands, undefined, { target })
    target.dispatchEvent(kbd('keydown', { code: 'KeyA', key: 'a' }))
    target.dispatchEvent(kbd('keydown', { code: 'KeyB', key: 'b' }))
    expect([listening.held('off'), listening.held('pass')]).toEqual([false, false])
    listening()
  })
})

describe('the capture phase', () => {
  test('lets a bound key reach its command before the element it was typed in', () => {
    const outer = document.createElement('div')
    const inner = document.createElement('div')
    outer.append(inner)
    /** @type {boolean[]} */
    const editorSawPrevented = []
    inner.addEventListener('keydown', (event) => {
      editorSawPrevented.push(event.defaultPrevented)
    })
    const bold = mock(() => undefined)
    const stop = keybinds([{ execute: bold, id: 'b', keys: ['ctrl+b'], label: 'Bold' }], undefined, {
      capture: true,
      target: outer,
    })
    inner.dispatchEvent(ctrlB('keydown'))
    expect([bold.mock.calls.length, editorSawPrevented]).toEqual([ONCE, []])
    stop()
  })

  test('lets a key no active command claims still reach the element', () => {
    const outer = document.createElement('div')
    const inner = document.createElement('div')
    outer.append(inner)
    const editor = mock(() => undefined)
    inner.addEventListener('keydown', editor)
    const bold = { execute: () => undefined, id: 'b', keys: ['ctrl+b'], label: 'Bold', when: () => false }
    const stop = keybinds([bold], undefined, { capture: true, target: outer })
    inner.dispatchEvent(ctrlB('keydown'))
    expect(editor).toHaveBeenCalledTimes(ONCE)
    stop()
  })
})
