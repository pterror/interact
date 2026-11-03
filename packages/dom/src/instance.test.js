/** @import { TemplateResult } from './template.js' */

import { describe, expect, test } from 'bun:test'

import { adoptInstance, createInstance } from './instance.js'
import { html } from './template.js'
import { find, noChildren, outerRange, serverMarkup } from './test-helpers.js'

/**
 * A paragraph with a bound title.
 * @param {string} title - The title
 * @returns {TemplateResult} The template
 */
function paragraph(title) {
  return html`<p title=${title}>text</p>`
}

describe('TemplateInstance', () => {
  test('renders afresh and updates its parts', () => {
    const { instance, nodes } = createInstance(paragraph('a'), document, noChildren)
    const container = document.createElement('div')
    container.append(nodes)
    instance.update(paragraph('b').values)
    expect(find(container, 'p').title).toBe('b')
  })

  test('adopts server markup between markers', () => {
    const container = serverMarkup(paragraph('a'))
    const server = find(container, 'p')
    adoptInstance(paragraph('b'), outerRange(container), noChildren)
    expect(find(container, 'p')).toBe(server)
    expect(server.title).toBe('b')
  })
})
