import { describe, expect, test } from 'bun:test'

import { ChildPart } from './child-part.js'
import { html } from './template.js'
import { emptyHole, find } from './test-helpers.js'

describe('ChildPart', () => {
  test('keeps its text node while the text changes', () => {
    const { container, range } = emptyHole()
    const part = new ChildPart(range, false)
    part.set('a')
    const text = range.open.nextSibling
    part.set('b')
    expect(range.open.nextSibling).toBe(text)
    expect(container.textContent).toBe('b')
  })

  test('replaces text with a template', () => {
    const { container, range } = emptyHole()
    const part = new ChildPart(range, false)
    part.set('a')
    part.set(html`<b>x</b>`)
    expect(find(container, 'b').textContent).toBe('x')
    expect(container.childNodes).toHaveLength([range.open, find(container, 'b'), range.close].length)
  })
})
