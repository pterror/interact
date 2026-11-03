import { describe, expect, test } from 'bun:test'

import { PropertyPart } from './property-part.js'

describe('PropertyPart', () => {
  test('sets the property only when the value changes', () => {
    const input = document.createElement('input')
    const part = new PropertyPart(input, 'value')
    part.set('a')
    input.value = 'typed'
    part.set('a')
    expect(input.value).toBe('typed')
    part.set('b')
    expect(input.value).toBe('b')
  })
})
