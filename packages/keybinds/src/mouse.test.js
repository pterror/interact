import { describe, test, expect, mock } from 'bun:test'

import { findConflict } from './binding.js'
import { validateCommands } from './core.js'
import { formatMouseParts, eventToMouseBindingString } from './mouse-ui.js'
import { keybinds, mouse } from './test-helpers.js'
import { kbd } from './test-helpers.js'
import { ALL, INPUT } from './test-inputs.js'

describe('formatMouseParts', () => {
  test('formats click buttons', () => {
    expect(formatMouseParts('Click')).toEqual(['Click'])
    expect(formatMouseParts('RightClick')).toEqual(['Right'])
    expect(formatMouseParts('MiddleClick')).toEqual(['Middle'])
  })

  test('formats modifiers', () => {
    expect(formatMouseParts('ctrl+Click')).toEqual(['Ctrl', 'Click'])
    expect(formatMouseParts('alt+RightClick')).toEqual(['Alt', 'Right'])
  })

  test('formats $mod as Ctrl on non-Mac', () => {
    expect(formatMouseParts('$mod+Click')).toEqual(['Ctrl', 'Click'])
  })
})

describe('eventToMouseBindingString', () => {
  test('converts left click', () => {
    const event = new MouseEvent('mousedown', { button: 0 })
    expect(eventToMouseBindingString(event)).toBe('click')
  })

  test('converts middle click', () => {
    const event = new MouseEvent('mousedown', { button: 1 })
    expect(eventToMouseBindingString(event)).toBe('middle')
  })

  test('converts right click', () => {
    const event = new MouseEvent('mousedown', { button: 2 })
    expect(eventToMouseBindingString(event)).toBe('right')
  })

  test('converts modified click', () => {
    const event = new MouseEvent('mousedown', { button: 0, ctrlKey: true })
    expect(eventToMouseBindingString(event)).toBe('$mod+click')
  })

  test('converts alt+shift+click', () => {
    const event = new MouseEvent('mousedown', { button: 0, altKey: true, shiftKey: true })
    expect(eventToMouseBindingString(event)).toBe('alt+shift+click')
  })
})

// --- Side buttons, press/release ---

describe('side buttons', () => {
  test('back and forward presses fire their own bindings, not scroll', () => {
    const back = mock(() => {})
    const fwd = mock(() => {})
    const up = mock(() => {})
    const down = mock(() => {})
    const target = document.createElement('div')
    const cleanup = keybinds(
      [
        { id: 'b', label: 'B', mouse: ['Back'], execute: back },
        { id: 'f', label: 'F', mouse: ['ForwardClick'], execute: fwd },
        { id: 'u', label: 'U', mouse: ['scrollup'], execute: up },
        { id: 'd', label: 'D', mouse: ['scrolldown'], execute: down },
      ],
      undefined,
      { target },
    )

    target.dispatchEvent(mouse('mousedown', 3))
    expect(back).toHaveBeenCalledTimes(1)
    target.dispatchEvent(mouse('mousedown', 4))
    expect(fwd).toHaveBeenCalledTimes(1)
    expect(up).not.toHaveBeenCalled()
    expect(down).not.toHaveBeenCalled()
    cleanup()
  })

  test('scroll bindings do not fire on side buttons when only scroll is bound', () => {
    const up = mock(() => {})
    const down = mock(() => {})
    const target = document.createElement('div')
    const cleanup = keybinds(
      [
        { id: 'u', label: 'U', mouse: ['scrollup'], execute: up },
        { id: 'd', label: 'D', mouse: ['scrolldown'], execute: down },
      ],
      undefined,
      { target },
    )
    target.dispatchEvent(mouse('mousedown', 3))
    target.dispatchEvent(mouse('mousedown', 4))
    expect(up).not.toHaveBeenCalled()
    expect(down).not.toHaveBeenCalled()
    cleanup()
  })

  test('buttons beyond the named five are ignored, not treated as click', () => {
    const fn = mock(() => {})
    const target = document.createElement('div')
    const cleanup = keybinds([{ id: 'c', label: 'C', mouse: ['Click'], execute: fn }], undefined, { target })
    target.dispatchEvent(mouse('mousedown', 5))
    target.dispatchEvent(mouse('mousedown', 7))
    expect(fn).not.toHaveBeenCalled()
    target.dispatchEvent(mouse('mousedown', 0))
    expect(fn).toHaveBeenCalledTimes(1)
    cleanup()
  })

  test('mousedown, mouseup and auxclick are canceled while the press fired', () => {
    const target = document.createElement('div')
    const cleanup = keybinds([{ id: 'b', label: 'B', mouse: ['Back'], execute: () => {} }], undefined, { target })
    const down = mouse('mousedown', 3)
    const up = mouse('mouseup', 3)
    const aux = mouse('auxclick', 3)
    target.dispatchEvent(down)
    target.dispatchEvent(up)
    target.dispatchEvent(aux)
    expect(down.defaultPrevented).toBe(true)
    expect(up.defaultPrevented).toBe(true)
    expect(aux.defaultPrevented).toBe(true)
    cleanup()
  })

  test('side buttons are left alone when nothing fired', () => {
    const target = document.createElement('div')
    const cleanup = keybinds(
      [{ id: 'b', label: 'B', mouse: ['Back'], when: () => false, execute: () => {} }],
      undefined,
      { target },
    )
    const down = mouse('mousedown', 3)
    const up = mouse('mouseup', 3)
    const aux = mouse('auxclick', 3)
    target.dispatchEvent(down)
    target.dispatchEvent(up)
    target.dispatchEvent(aux)
    expect(down.defaultPrevented).toBe(false)
    expect(up.defaultPrevented).toBe(false)
    expect(aux.defaultPrevented).toBe(false)
    cleanup()
  })

  test('a release-only side binding cancels its mouseup and auxclick', () => {
    const target = document.createElement('div')
    const cleanup = keybinds([{ id: 'b', label: 'B', mouse: ['Forward:up'], execute: () => {} }], undefined, { target })
    target.dispatchEvent(mouse('mousedown', 4))
    const up = mouse('mouseup', 4)
    const aux = mouse('auxclick', 4)
    target.dispatchEvent(up)
    target.dispatchEvent(aux)
    expect(up.defaultPrevented).toBe(true)
    expect(aux.defaultPrevented).toBe(true)
    cleanup()
  })

  test('a stale auxclick block does not leak into the next press', () => {
    const target = document.createElement('div')
    let active = true
    const cleanup = keybinds(
      [{ id: 'b', label: 'B', mouse: ['Back'], when: () => active, execute: () => {} }],
      undefined,
      { target },
    )
    target.dispatchEvent(mouse('mousedown', 3))
    target.dispatchEvent(mouse('mouseup', 3))
    active = false
    target.dispatchEvent(mouse('mousedown', 3))
    const aux = mouse('auxclick', 3)
    target.dispatchEvent(aux)
    expect(aux.defaultPrevented).toBe(false)
    cleanup()
  })

  test('parse, format and conflict handle back/forward', () => {
    expect(() =>
      validateCommands([{ id: 'x', label: 'X', mouse: ['Back', 'forward', 'ctrl+BackClick'], execute: () => {} }], ALL),
    ).not.toThrow()
    expect(formatMouseParts('Back')).toEqual(['Back'])
    expect(formatMouseParts('ctrl+ForwardClick')).toEqual(['Ctrl', 'Forward'])
    const schema = { s: { label: 'S', mouse: ['back'] } }
    expect(findConflict(schema, { binding: 'BackClick', input: INPUT.mouse })?.commandId).toBe('s')
    expect(findConflict(schema, { binding: 'scrollup', input: INPUT.mouse })).toBeUndefined()
    expect(findConflict(schema, { binding: 'forward', input: INPUT.mouse })).toBeUndefined()
  })

  test('eventToMouseBindingString names side buttons and rejects unnamed ones', () => {
    expect(eventToMouseBindingString(mouse('mousedown', 3))).toBe('back')
    expect(eventToMouseBindingString(mouse('mousedown', 4))).toBe('forward')
    expect(eventToMouseBindingString(mouse('mousedown', 5))).toBeNull()
  })
})

describe('scroll gestures', () => {
  // (happy-dom's WheelEvent ignores modifier keys, so these bind plain scrolling)
  /** @param {number} deltaY @param {number} [deltaMode] */
  const wheel = (deltaY, deltaMode = 0) => new WheelEvent('wheel', { deltaY, deltaMode, cancelable: true })

  test('a mouse-wheel notch is one step', () => {
    const fn = mock(() => {})
    const target = document.createElement('div')
    const cleanup = keybinds([{ id: 'z', label: 'Zoom out', mouse: ['scrolldown'], execute: fn }], undefined, {
      target,
    })
    target.dispatchEvent(wheel(100))
    expect(fn).toHaveBeenCalledTimes(1)
    cleanup()
  })

  test("a trackpad's small deltas add up to a step, and the page doesn't scroll in between", () => {
    const fn = mock(() => {})
    const target = document.createElement('div')
    const cleanup = keybinds([{ id: 'z', label: 'Zoom out', mouse: ['scrolldown'], execute: fn }], undefined, {
      target,
    })
    const events = Array.from({ length: 10 }, () => wheel(12))
    for (const e of events) target.dispatchEvent(e)
    // 120px in 12px events: steps at 48+ and 96+... one per 50px
    expect(fn).toHaveBeenCalledTimes(2)
    expect(events.every((e) => e.defaultPrevented)).toBe(true)
    cleanup()
  })

  test('lines count as pixels', () => {
    const fn = mock(() => {})
    const target = document.createElement('div')
    const cleanup = keybinds([{ id: 'z', label: 'Z', mouse: ['scrolldown'], execute: fn }], undefined, { target })
    target.dispatchEvent(wheel(3, 1))
    expect(fn).toHaveBeenCalledTimes(0)
    target.dispatchEvent(wheel(1, 1))
    expect(fn).toHaveBeenCalledTimes(1)
    cleanup()
  })

  test('a pause starts a new gesture', async () => {
    const fn = mock(() => {})
    const target = document.createElement('div')
    const cleanup = keybinds([{ id: 'z', label: 'Z', mouse: ['scrolldown'], execute: fn }], undefined, {
      target,
      wheel: { idle: 30 },
    })
    target.dispatchEvent(wheel(40))
    await Bun.sleep(60)
    target.dispatchEvent(wheel(40))
    expect(fn).toHaveBeenCalledTimes(0)
    cleanup()
  })

  test('a command returning false gives the gesture back to the page', () => {
    const fn = mock(() => false)
    const target = document.createElement('div')
    const cleanup = keybinds([{ id: 'z', label: 'Z', mouse: ['scrolldown'], execute: fn }], undefined, { target })
    target.dispatchEvent(wheel(60))
    const later = wheel(60)
    target.dispatchEvent(later)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(later.defaultPrevented).toBe(false)
    cleanup()
  })
})

describe('mouse buttons held and released', () => {
  /** @param {string[]} calls */
  const recorder = (calls) => (/** @type {unknown} */ _, /** @type {Event | undefined} */ e) => {
    calls.push(/** @type {Event} */ (e).type)
  }

  test('mouse buttons, and losing focus', () => {
    const target = document.createElement('div')
    const kb = keybinds(
      [
        { execute: () => {}, id: 'fire', label: 'Fire', mouse: ['Click'] },
        { execute: () => {}, id: 'fwd', keys: ['w'], label: 'Forward' },
      ],
      undefined,
      { target },
    )
    target.dispatchEvent(mouse('mousedown', 0, { buttons: 1 }))
    target.dispatchEvent(kbd('keydown', { code: 'KeyW', key: 'w' }))
    expect(kb.held('fire')).toBe(true)
    window.dispatchEvent(new Event('blur'))
    expect(kb.held('fwd')).toBe(false)
    expect(kb.held('fire')).toBe(true)
    target.dispatchEvent(mouse('mouseup', 0, { buttons: 0 }))
    expect(kb.held('fire')).toBe(false)
    kb()
  })

  test('a mouse button is not released just because focus went', () => {
    /** @type {string[]} */
    const calls = []
    const target = document.createElement('div')
    const cleanup = keybinds(
      [{ execute: recorder(calls), id: 'm', label: 'M', mouse: ['MiddleClick', 'MiddleClick:up'] }],
      undefined,
      { target },
    )
    target.dispatchEvent(mouse('mousedown', 1, { buttons: 4 }))
    window.dispatchEvent(new Event('blur'))
    // Still held when the page hears from the mouse again
    target.dispatchEvent(mouse('mousemove', 0, { buttons: 4 }))
    expect(calls).toEqual(['mousedown'])
    target.dispatchEvent(mouse('mouseup', 1, { buttons: 0 }))
    expect(calls).toEqual(['mousedown', 'mouseup'])
    cleanup()
  })

  test('a mouse button let go out of sight is released on the next mouse event', () => {
    /** @type {string[]} */
    const calls = []
    const target = document.createElement('div')
    const cleanup = keybinds(
      [{ execute: recorder(calls), id: 'm', label: 'M', mouse: ['MiddleClick', 'MiddleClick:up'] }],
      undefined,
      { target },
    )
    target.dispatchEvent(mouse('mousedown', 1, { buttons: 4 }))
    target.dispatchEvent(mouse('mousemove', 0, { buttons: 0 }))
    expect(calls).toEqual(['mousedown', 'mouseup'])
    cleanup()
  })

  test("another button going down doesn't release one that is still held", () => {
    /** @type {string[]} */
    const calls = []
    const target = document.createElement('div')
    const cleanup = keybinds(
      [{ execute: recorder(calls), id: 'm', label: 'M', mouse: ['MiddleClick', 'MiddleClick:up'] }],
      undefined,
      { target },
    )
    target.dispatchEvent(mouse('mousedown', 1, { buttons: 4 }))
    target.dispatchEvent(mouse('mousedown', 0, { buttons: 5 }))
    target.dispatchEvent(mouse('mouseup', 0, { buttons: 4 }))
    expect(calls).toEqual(['mousedown'])
    cleanup()
  })

  test('format adds a Release part', () => {
    expect(formatMouseParts('MiddleClick:up')).toEqual(['Middle', 'Release'])
  })

  test('event to binding string gives :up for mouseup', () => {
    expect(eventToMouseBindingString(mouse('mouseup', 1))).toBe('middle:up')
    expect(eventToMouseBindingString(mouse('mouseup', 3))).toBe('back:up')
    expect(eventToMouseBindingString(mouse('mousedown', 1))).toBe('middle')
  })
})
