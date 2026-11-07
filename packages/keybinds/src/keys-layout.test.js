/** @import { Keyboard } from './keyboard-map.js' */

import { describe, expect, test } from 'bun:test'

import { formatBinding } from './binding-format.js'
import { followLayout, layout, loadLayout } from './keys-layout.js'
import { formatKeyParts, keysUI } from './keys-ui.js'

const ONCE = 1
const TWICE = 2
const SETTLED = 0

/** A German layout: the key a US layout calls "/" types "-", and the 1 key's Shift is "!" */
const GERMAN = new Map([
  ['BracketLeft', 'ü'],
  ['Digit1', '1'],
  ['KeyZ', 'y'],
  ['Slash', '-'],
])

const US = new Map([
  ['KeyZ', 'z'],
  ['Slash', '/'],
])

/**
 * The window the page's document is in, which the tests' events reach
 * @returns {Window} The window
 */
function view() {
  return document.defaultView ?? globalThis.window
}

/**
 * A browser keyboard whose layout the test sets
 * @param {ReadonlyMap<string, string>} first - The layout it starts with
 * @returns {Readonly<{ restore: () => void, set: (next: ReadonlyMap<string, string>) => void }>} A way to switch
 *   layouts, and to take the keyboard away again
 */
function fakeKeyboard(first) {
  let current = first
  /** @type {Keyboard} */
  const keyboard = { getLayoutMap: () => Promise.resolve(current) }
  Object.defineProperty(navigator, 'keyboard', { configurable: true, value: keyboard })
  return {
    restore: () => {
      Object.defineProperty(navigator, 'keyboard', { configurable: true, value: undefined })
    },
    set: (next) => {
      current = next
    },
  }
}

/**
 * Counts how often a piece of key syntax says how keys are shown changed
 * @param {import('./keys.js').KeySyntax} piece - The piece
 * @returns {() => number} How many changes so far
 */
function changesOf(piece) {
  let changes = 0
  piece.watch?.(() => {
    changes += ONCE
  })
  return () => changes
}

describe('keyboard layouts', () => {
  test('show physical keys as the layout types them', () => {
    expect(formatKeyParts('shift+slash', [layout(GERMAN)])).toEqual(['Shift', '-'])
    expect(formatKeyParts('bracketleft', [layout(GERMAN)])).toEqual(['Ü'])
    const input = keysUI(layout(GERMAN))
    expect(formatBinding(input, 'ctrl+bracketleft')).toEqual(['Ctrl', 'Ü'])
  })

  test('show letters as written, since they are bound by what they type', () => {
    expect(formatKeyParts('z', [layout(GERMAN)])).toEqual(['Z'])
  })

  test('show keys as on a US layout without a layout, or for keys it does not know', () => {
    expect(formatKeyParts('shift+slash', [layout()])).toEqual(['Shift', '/'])
    expect(formatKeyParts('comma', [layout(GERMAN)])).toEqual([','])
  })

  test('are unknown where the browser cannot tell', async () => {
    expect(await loadLayout()).toBeUndefined()
  })
})

describe('following the layout', () => {
  test('loads it, and looks again when the window gets focus back', async () => {
    const keyboard = fakeKeyboard(US)
    const piece = followLayout(view())
    const changes = changesOf(piece)
    await Bun.sleep(SETTLED)
    const before = piece.glyph?.('slash')
    keyboard.set(GERMAN)
    view().dispatchEvent(new Event('focus'))
    await Bun.sleep(SETTLED)
    expect([before, piece.glyph?.('slash'), changes()]).toEqual(['/', '-', TWICE])
    keyboard.restore()
  })

  test('looks again when a key types something the layout did not say', async () => {
    const keyboard = fakeKeyboard(US)
    const piece = followLayout(view())
    await Bun.sleep(SETTLED)
    keyboard.set(GERMAN)
    view().dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyZ', key: 'y' }))
    await Bun.sleep(SETTLED)
    expect(piece.glyph?.('slash')).toBe('-')
    keyboard.restore()
  })

  test('lets keysUI follow it, so the components showing bindings do', async () => {
    const keyboard = fakeKeyboard(US)
    const input = keysUI(followLayout(view()))
    let changes = 0
    input.watch?.(() => {
      changes += ONCE
    })
    await Bun.sleep(SETTLED)
    expect(changes).toBe(ONCE)
    keyboard.restore()
  })
})
