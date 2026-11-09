import { afterEach, describe, expect, mock, test } from 'bun:test'

import { modifierHeld } from './modifier-held.js'
import { kbd } from './test-keys.js'

/** @type {(() => void)[]} */
const cleanups = []

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) {
    cleanup()
  }
})

/**
 * Follows Alt on a fresh element
 * @returns {Readonly<{ alt: ReturnType<typeof modifierHeld>, heard: ReturnType<typeof mock<() => void>>,
 *   target: HTMLElement }>} Whether Alt is held, what heard it change, and the element
 */
function following() {
  const target = document.createElement('div')
  document.body.append(target)
  const alt = modifierHeld({ modifier: 'Alt', target })
  const heard = mock(() => undefined)
  alt.watch(heard)
  cleanups.push(() => {
    alt.stop()
    target.remove()
  })
  return { alt, heard, target }
}

describe('modifierHeld', () => {
  test('is held from its press to its release, with other keys between', () => {
    const { alt, heard, target } = following()
    expect(alt.get()).toBe(false)
    target.dispatchEvent(kbd('keydown', { altKey: true, code: 'AltLeft', key: 'Alt' }))
    expect(alt.get()).toBe(true)
    target.dispatchEvent(kbd('keydown', { altKey: true, code: 'ArrowUp', key: 'ArrowUp' }))
    expect(alt.get()).toBe(true)
    target.dispatchEvent(kbd('keyup', { code: 'AltLeft', key: 'Alt' }))
    expect(alt.get()).toBe(false)
    expect(heard).toHaveBeenCalledTimes(2)
  })

  test("catches up from a pointer event's modifier state, a press or a release it missed", () => {
    const { alt, target } = following()
    target.dispatchEvent(new PointerEvent('pointermove', { altKey: true, bubbles: true }))
    expect(alt.get()).toBe(true)
    target.dispatchEvent(new PointerEvent('pointermove', { altKey: false, bubbles: true }))
    expect(alt.get()).toBe(false)
  })

  test('lets go when the window loses focus, and hears nothing once stopped', () => {
    const { alt, heard, target } = following()
    target.dispatchEvent(kbd('keydown', { altKey: true, code: 'AltLeft', key: 'Alt' }))
    globalThis.dispatchEvent(new Event('blur'))
    expect(alt.get()).toBe(false)
    alt.stop()
    target.dispatchEvent(kbd('keydown', { altKey: true, code: 'AltLeft', key: 'Alt' }))
    expect(alt.get()).toBe(false)
    expect(heard).toHaveBeenCalledTimes(2)
  })
})
