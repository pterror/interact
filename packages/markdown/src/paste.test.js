import { describe, expect, test } from 'bun:test'

import { reader } from '@pterror/interact-editor/reader'

import { htmlToMarkdown } from './paste.js'
import { testGrammar, testLook } from './test-grammar.js'

/**
 * What markdown shows, as the reader draws it
 * @param {string} markdown - The markdown
 * @returns {string} Its visible text
 */
function shows(markdown) {
  const shown = reader({
    grammar: testGrammar,
    look: testLook((name, attributes) => ({ attributes, name })),
    textClass: 'text',
  })
  shown.show(markdown)
  return shown.element.textContent
}

describe('htmlToMarkdown', () => {
  test('writes inline formatting, links and images as markdown', () => {
    expect(htmlToMarkdown('<b>bold</b> <i>it </i><a href="u">link</a> <img src="i.png" alt="a"> <code>x</code>')).toBe(
      '**bold** *it* [link](u) ![a](i.png) `x`',
    )
  })

  test('writes blocks with a blank line between', () => {
    expect(
      htmlToMarkdown('<h2>Title</h2><p>one</p><ul><li>a</li><li>b</li></ul><blockquote><p>q</p></blockquote>'),
    ).toBe('## Title\n\none\n\n- a\n- b\n\n> q')
  })

  test('escapes what markdown would read', () => {
    expect(htmlToMarkdown('<p>2 * 3 = [6]</p>')).toBe(String.raw`2 \* 3 = \[6\]`)
  })

  test('keeps elements markdown has no syntax for as HTML', () => {
    expect(htmlToMarkdown('<p>a <span class="k">b</span> <span>c</span></p>')).toBe('a <span class="k">b</span> c')
  })

  test('keeps a block as HTML when its markdown would show other text', () => {
    expect(htmlToMarkdown('<p>one</p><p>two</p>', () => 'something else')).toBe('<p>one</p>\n\n<p>two</p>')
    expect(htmlToMarkdown('<p><b>one</b></p>', shows)).toBe('**one**')
  })
})
