import { describe, expect, test } from 'bun:test'

import { flipRelease } from './flip-release.js'
import { splitBinding } from './split-binding.js'

describe('splitBinding', () => {
  test('splits into steps and a suffix, whatever syntax is on', () => {
    expect(splitBinding('g  i')).toEqual({ steps: ['g', 'i'], suffix: '' })
    expect(splitBinding('ctrl + k:HOLD')).toEqual({ steps: ['ctrl+k'], suffix: ':hold' })
  })
})

describe('flipRelease', () => {
  test('flips between a press and its release, kept as written', () => {
    expect(flipRelease('Ctrl+K')).toBe('Ctrl+K:up')
    expect(flipRelease(' Ctrl+K:UP ')).toBe('Ctrl+K')
  })
})
