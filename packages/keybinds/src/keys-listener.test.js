import { describe, expect, test } from 'bun:test'

import { kbd, keybinds, recording } from './test-helpers.js'

describe('keys whose release never arrives', () => {
  test('are released when the window loses focus, and the real keyup later has nothing left to release', () => {
    const fired = recording()
    const target = document.createElement('div')
    const stop = keybinds([{ execute: fired.execute, id: 'k', keys: ['k', 'k:up'], label: 'K' }], undefined, {
      target,
    })
    target.dispatchEvent(kbd('keydown', { code: 'KeyK', key: 'k' }))
    target.ownerDocument.defaultView?.dispatchEvent(new Event('blur'))
    expect(fired.types).toEqual(['keydown', 'keyup'])
    target.dispatchEvent(kbd('keyup', { code: 'KeyK', key: 'k' }))
    expect(fired.types).toEqual(['keydown', 'keyup'])
    stop()
  })
})
