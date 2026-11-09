import { describe, expect, test } from 'bun:test'

import { aliases } from './aliases.js'
import { axisParse } from './axis-parse.js'
import { keybinds } from './keybinds.js'

describe('axisParse', () => {
  test('reads mouse, stick, trigger and key sources, and an inversion', () => {
    expect(axisParse('-Mouse:Y')).toEqual({ axis: 'y', invert: true, kind: 'mouse', lookup: 'mouse:y' })
    expect(axisParse('pad:rt')).toEqual({ axis: 'rt', invert: false, kind: 'pad', lookup: 'pad:rt' })
    expect(axisParse('keys:A/d').lookup).toBe('keys:a/d')
    expect(axisParse('keys:left/right', [aliases()])).toMatchObject({ negative: 'arrowleft', positive: 'arrowright' })
  })

  test('rejects a source that names none, and a key pair that is not two keys', () => {
    expect(() => axisParse('mouse:z')).toThrow('Unknown axis')
    expect(() => axisParse('keys:a')).toThrow('Unknown axis')
    expect(() => axisParse('keys:a/d/w')).toThrow('Unknown axis')
    expect(() => axisParse('keys:a/banana')).toThrow('Axis "keys:a/banana": Unknown key "banana"')
  })

  test('is checked by keybinds() before it listens', () => {
    expect(() => {
      keybinds([{ axes: ['mouse:x', '-pad:ry', 'keys:a/d', 'pad:rt'] }])()
    }).not.toThrow()
    expect(() => keybinds([{ axes: ['mouse:x:up'] }])).toThrow('Unknown axis')
  })
})
