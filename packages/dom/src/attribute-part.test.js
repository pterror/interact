import { describe, expect, test } from 'bun:test'

import { AttributePart } from './attribute-part.js'

describe('AttributePart', () => {
  test('sets, empties and removes the attribute, starting from what the element has', () => {
    const element = document.createElement('p')
    element.setAttribute('title', 'server')
    const part = new AttributePart(element, 'title')
    part.set('server')
    expect(element.getAttribute('title')).toBe('server')
    part.set(true)
    expect(element.getAttribute('title')).toBe('')
    part.set(false)
    expect(element.hasAttribute('title')).toBe(false)
  })
})
