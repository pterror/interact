import { describe, expect, test } from 'bun:test'

import { formatModifier } from './modifiers.js'
import { byPlatform } from './platform.js'

describe('byPlatform', () => {
  const choices = { mac: ['alt+Escape'], other: ['ctrl+Space'] }

  test('chooses the Mac binding on a Mac and the other elsewhere', () => {
    expect([byPlatform(choices, true), byPlatform(choices, false)]).toEqual([['alt+Escape'], ['ctrl+Space']])
  })

  test('decides by the platform $mod does when not told', () => {
    expect(byPlatform(choices)).toEqual(formatModifier('$mod') === '⌘' ? choices.mac : choices.other)
  })
})
