import { describe, expect, test } from 'bun:test'

import { keybinds } from './keybinds.js'
import { padParse } from './pad-parse.js'

describe('padParse', () => {
  test('names buttons by their standard names and aliases', () => {
    expect(['South', 'dpadUp', 'r2', 'rt'].map((each) => padParse(each).lookup)).toEqual(['a', 'up', 'rt', 'rt'])
    expect(() => {
      keybinds([{ pad: ['a', 'south', 'rt:up', 'dpadUp'], run: () => undefined }], { releases: true })()
    }).not.toThrow()
  })

  test('takes no modifiers, and no unknown buttons', () => {
    expect(() => padParse('shift+a')).toThrow('Unknown gamepad button')
    expect(() => padParse('z')).toThrow('Unknown gamepad button "z"')
  })
})
