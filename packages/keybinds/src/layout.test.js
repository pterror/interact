import { describe, expect, test } from 'bun:test'

import { layout } from './layout.js'

const GERMAN = new Map([
  ['KeyZ', 'y'],
  ['Slash', '-'],
])

const US = new Map([
  ['KeyZ', 'z'],
  ['Slash', '/'],
])

/**
 * A browser keyboard whose layout the test sets
 * @param {ReadonlyMap<string, string>} first - The layout it starts with
 * @returns {Readonly<{ restore: () => void, set: (next: ReadonlyMap<string, string>) => void }>} Switching layouts,
 *   and taking the keyboard away again
 */
function fakeKeyboard(first) {
  let current = first
  Object.defineProperty(navigator, 'keyboard', {
    configurable: true,
    value: { getLayoutMap: () => Promise.resolve(current) },
  })
  return {
    restore() {
      Object.defineProperty(navigator, 'keyboard', { configurable: true, value: undefined })
    },
    set(next) {
      current = next
    },
  }
}

describe('layout', () => {
  test('is unknown where the browser can not tell', async () => {
    const unknown = layout()
    await Bun.sleep(0)
    expect(unknown.get()).toBeUndefined()
  })

  test('loads, and looks again when the window gets focus back', async () => {
    const keyboard = fakeKeyboard(US)
    const followed = layout()
    let changes = 0
    const stop = followed.watch(() => {
      changes += 1
    })
    await Bun.sleep(0)
    const before = followed.get()?.get('Slash')
    keyboard.set(GERMAN)
    globalThis.dispatchEvent(new Event('focus'))
    await Bun.sleep(0)
    expect([before, followed.get()?.get('Slash'), changes]).toEqual(['/', '-', 2])
    stop()
    keyboard.restore()
  })

  test('looks again when a key types something the layout did not say', async () => {
    const keyboard = fakeKeyboard(US)
    const followed = layout()
    const stop = followed.watch(() => undefined)
    await Bun.sleep(0)
    keyboard.set(GERMAN)
    globalThis.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyZ', key: 'y' }))
    await Bun.sleep(0)
    expect(followed.get()?.get('Slash')).toBe('-')
    stop()
    keyboard.restore()
  })
})
