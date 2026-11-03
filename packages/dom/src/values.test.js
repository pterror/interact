import { describe, expect, test } from 'bun:test'

import { html } from './template.js'
import { NOTHING, attributeText, childOf, handlerOf } from './values.js'

const ONE = 1

describe('values', () => {
  test('leaves an attribute out for false, null and undefined, and keeps an empty one', () => {
    const missing = document.documentElement.getAttribute('missing')
    expect([false, missing, undefined, true, '', ONE].map((value) => attributeText(value, 'x'))).toEqual([
      undefined,
      undefined,
      undefined,
      '',
      '',
      '1',
    ])
  })

  test('reads child content', () => {
    const result = html`<b></b>`
    expect(childOf('')).toBe(NOTHING)
    expect(childOf(ONE)).toEqual({ kind: 'text', text: '1' })
    expect(childOf(result)).toBe(result)
  })

  test('names what a hole cannot take', () => {
    expect(() => handlerOf('x', 'click')).toThrow('Event "click" takes a function, not string')
    expect(() => childOf(true)).toThrow('not boolean')
  })
})
