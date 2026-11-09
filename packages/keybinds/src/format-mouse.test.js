import { describe, expect, test } from 'bun:test'

import { formatMouse } from './format-mouse.js'
import { formatPad } from './format-pad.js'
import { formatSteps } from './format-steps.js'
import { isMac } from './modifiers.js'

describe('formatMouse', () => {
  test('shows each button by its name, and modifiers', () => {
    expect(['Click', 'RightClick', 'MiddleClick', 'Back', 'scrollup'].map((each) => formatMouse(each))).toEqual([
      ['Click'],
      ['Right'],
      ['Middle'],
      ['Back'],
      ['Scroll ↑'],
    ])
    expect(formatMouse('$mod+ForwardClick')).toEqual([isMac ? '⌘' : 'Ctrl', 'Forward'])
    expect(formatSteps('MiddleClick:up', formatMouse)).toEqual(['Middle', 'Release'])
  })
})

describe('formatPad', () => {
  test('shows each button by its standard name, whatever name the binding used', () => {
    expect(formatPad('rt')).toEqual(['RT'])
    expect(formatSteps('south:up', formatPad)).toEqual(['A', 'Release'])
    expect(formatPad('dpadUp')).toEqual(['D-pad ↑'])
    expect(formatPad('Banana')).toEqual(['Banana'])
  })
})
