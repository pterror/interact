import { describe, expect, test } from 'bun:test'

import { axisToLookup, parseAxis } from './axes.js'
import { keybinds } from './test-helpers.js'

describe('parseAxis', () => {
  test('reads mouse, stick, trigger and key sources, and an inversion', () => {
    expect(parseAxis('-Mouse:Y')).toEqual({ invert: true, kind: 'mouse', source: 'y' })
    expect(parseAxis('pad:rt')).toEqual({ invert: false, kind: 'pad', source: 'rt' })
    expect(axisToLookup(parseAxis('keys:A/d'))).toBe('keys:a/d')
  })

  test('rejects a source that names none, and a key pair that is not two keys', () => {
    expect(() => parseAxis('mouse:z')).toThrow('Unknown axis')
    expect(() => parseAxis('keys:a')).toThrow('Unknown axis')
    expect(() => parseAxis('keys:a/d/w')).toThrow('Unknown axis')
  })
})

describe('axes through keybinds()', () => {
  test('are checked when listening starts, naming the axis', () => {
    expect(() => {
      keybinds([], undefined, {
        axes: [{ axes: ['mouse:x', '-pad:ry', 'keys:a/d', 'pad:rt'], id: 'a', label: 'A' }],
      })()
    }).not.toThrow()
    expect(() => keybinds([], undefined, { axes: [{ axes: ['mouse:z'], id: 'a', label: 'A' }] })).toThrow(/Axis "a"/u)
  })

  test('take no suffix', () => {
    expect(() => keybinds([], undefined, { axes: [{ axes: ['mouse:x:up'], id: 'a', label: 'A' }] })).toThrow()
  })
})
