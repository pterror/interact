import { describe, expect, test } from 'bun:test'

import { keybinds } from './keybinds.js'
import { mouseParse } from './mouse-parse.js'

describe('mouseParse', () => {
  test('reads every name for a button as one button', () => {
    expect(mouseParse('LeftClick').lookup).toBe('click')
    expect(mouseParse('ctrl+BackClick')).toEqual({
      bare: 'back',
      lookup: 'ctrl+back',
      mods: { alt: false, ctrl: true, meta: false, shift: false },
    })
    expect(['Back', 'forward', 'ForwardClick', 'middle'].map((each) => mouseParse(each).lookup)).toEqual([
      'back',
      'forward',
      'forward',
      'middle',
    ])
  })

  test('rejects what names no button, and a scroll with a suffix', () => {
    expect(() => mouseParse('ctrl')).toThrow('no button')
    expect(() => mouseParse('click+right')).toThrow('multiple buttons')
    expect(() => mouseParse('wheel')).toThrow('Unknown mouse button')
    expect(() => mouseParse('scrollup', ':up')).toThrow('Scroll has no ":up"')
    expect(() => keybinds([{ mouse: ['scrolldown:hold'], run: () => undefined }], { holds: true })).toThrow(
      'Scroll has no ":hold"',
    )
  })
})
