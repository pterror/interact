import { describe, expect, test } from 'bun:test'

import { collect } from './collect.js'
import { html } from './template.js'
import { outerRange, serverMarkup } from './test-helpers.js'

const TWO = 2

describe('collect', () => {
  test("finds a template's bound elements and child holes, not those of templates inside it", () => {
    const container = serverMarkup(html`<p class=${'a'}>${html`<b class=${'b'}>${'x'}</b>`}</p> ${'y'}`)
    const range = outerRange(container)
    const found = collect({ end: range.close, first: range.open.nextSibling })
    expect(found.elements.map((element) => element.tagName)).toEqual(['P'])
    expect(found.children).toHaveLength(TWO)
  })
})
