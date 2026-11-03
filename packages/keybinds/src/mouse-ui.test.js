import { describe, expect, test } from 'bun:test'

import { eventToMouseBindingString, formatMouseParts } from './mouse-ui.js'
import { mouse } from './test-helpers.js'

const LEFT = 0
const MIDDLE = 1
const RIGHT = 2
const BACK = 3
const FORWARD = 4
const UNNAMED = 5

describe('formatMouseParts', () => {
  test('shows each button by its name', () => {
    expect(formatMouseParts('Click')).toEqual(['Click'])
    expect(formatMouseParts('RightClick')).toEqual(['Right'])
    expect(formatMouseParts('MiddleClick')).toEqual(['Middle'])
    expect(formatMouseParts('Back')).toEqual(['Back'])
  })

  test('shows modifiers, $mod as Ctrl off a Mac', () => {
    expect(formatMouseParts('ctrl+Click')).toEqual(['Ctrl', 'Click'])
    expect(formatMouseParts('alt+RightClick')).toEqual(['Alt', 'Right'])
    expect(formatMouseParts('$mod+Click')).toEqual(['Ctrl', 'Click'])
    expect(formatMouseParts('ctrl+ForwardClick')).toEqual(['Ctrl', 'Forward'])
  })

  test('adds a Release part', () => {
    expect(formatMouseParts('MiddleClick:up')).toEqual(['Middle', 'Release'])
  })
})

describe('eventToMouseBindingString', () => {
  test('names each button', () => {
    expect(eventToMouseBindingString(mouse('mousedown', LEFT))).toBe('click')
    expect(eventToMouseBindingString(mouse('mousedown', MIDDLE))).toBe('middle')
    expect(eventToMouseBindingString(mouse('mousedown', RIGHT))).toBe('right')
    expect(eventToMouseBindingString(mouse('mousedown', BACK))).toBe('back')
    expect(eventToMouseBindingString(mouse('mousedown', FORWARD))).toBe('forward')
  })

  test('writes modifiers before the button', () => {
    expect(eventToMouseBindingString(mouse('mousedown', LEFT, { ctrlKey: true }))).toBe('$mod+click')
    expect(eventToMouseBindingString(mouse('mousedown', LEFT, { altKey: true, shiftKey: true }))).toBe(
      'alt+shift+click',
    )
  })

  test('gives a mouseup as a release', () => {
    expect(eventToMouseBindingString(mouse('mouseup', MIDDLE))).toBe('middle:up')
    expect(eventToMouseBindingString(mouse('mouseup', BACK))).toBe('back:up')
  })

  test('has nothing for a button no binding names', () => {
    expect(eventToMouseBindingString(mouse('mousedown', UNNAMED))).toBeUndefined()
  })
})
