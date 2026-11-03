import { describe, expect, test } from 'bun:test'

import { html, repeat } from './template.js'

describe('template', () => {
  test('html keeps the same strings each time a template runs', () => {
    const [first, second] = ['a', 'b'].map((value) => html`<p>${value}</p>`)
    expect(first?.strings).toBe(second?.strings)
    expect([first?.values, second?.values]).toEqual([['a'], ['b']])
  })

  test('repeat keys each item', () => {
    const items = repeat(
      ['x', 'y'],
      (item) => `k${item}`,
      (item) => html`<i>${item}</i>`,
    )
    expect(items.entries.map(({ key }) => key)).toEqual(['kx', 'ky'])
  })
})
