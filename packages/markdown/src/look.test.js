import { describe, expect, test } from 'bun:test'

import { Language, defineLanguageFacet, ensureSyntaxTree } from '@codemirror/language'
import { EditorState } from '@codemirror/state'
import { inlineDecorations } from '@pterror/interact-editor/decorations'
import { reader } from '@pterror/interact-editor/reader'

import { markdownGrammar } from './grammar.js'
import { markdownLook } from './look.js'

/**
 * A policy letting everything through but `javascript:` addresses and `x-` elements
 * @type {import('./look.js').Html}
 */
function policy(name, attributes, content) {
  if (name.startsWith('x-') || Object.values(attributes).some((value) => /^javascript:/iu.test(value))) {
    return undefined
  }
  return { attributes, name, ...(content === undefined ? {} : { content }) }
}

/**
 * What the reader draws for a text
 * @param {string} text - The text
 * @returns {string} Its HTML
 */
function drawn(text) {
  const shown = reader({ grammar: markdownGrammar(), look: markdownLook(policy), textClass: 'text' })
  shown.show(text)
  return shown.element.innerHTML
}

describe('the markdown look, read', () => {
  test('pairs HTML tags in a paragraph into one element over the markdown between', () => {
    expect(drawn('a <b>bold *x* y</b>')).toBe('<p>a <b>bold <em>x</em> y</b></p>')
    expect(drawn('first\n\nthen <i>one\ntwo</i>')).toBe('<p>first</p><p>then <i>one\ntwo</i></p>')
  })

  test('draws an element the policy refuses as its source', () => {
    expect(drawn('<x-y>t</x-y>')).toBe('<p>&lt;x-y&gt;t&lt;/x-y&gt;</p>')
    expect(drawn('[go](JavaScript:x)')).toBe('<p>go</p>')
  })

  test('draws HTML blocks, raw text and void elements', () => {
    expect(drawn('<div class="k">\nq\n</div>')).toBe('<div class="k">q</div>')
    expect(drawn('<style>p { color: red }</style>')).toBe('<style>p { color: red }</style>')
    expect(drawn('one<br>two')).toBe('<p>one<br>two</p>')
  })

  test('draws an element with nothing inside it', () => {
    expect(drawn('a <i class="icon"></i> b')).toBe('<p>a <i class="icon"></i> b</p>')
    expect(drawn('<div></div>')).toBe('<div></div>')
  })

  test('hides a close tag that closes nothing', () => {
    expect(drawn('a</i> b')).toBe('<p>a b</p>')
  })

  test('draws links, images and code', () => {
    expect(drawn('[a](u "t") <http://x.y> http://z.w')).toBe(
      '<p><a href="u" title="t">a</a> <a href="http://x.y">http://x.y</a> <a href="http://z.w">http://z.w</a></p>',
    )
    expect(drawn('![alt](i.png)')).toBe('<p><img alt="alt" src="i.png" data-unsized=""></p>')
    expect(drawn('```js\nlet x\n```')).toBe('<pre data-language="js"><code>let x</code></pre>')
    expect(drawn('`a` b')).toBe('<p><code>a</code> b</p>')
  })

  test('draws headings, quotes and lists without their marks', () => {
    expect(drawn('# One\n\n> two\n> lines')).toBe('<h1>One</h1><blockquote><p>two\nlines</p></blockquote>')
    expect(drawn('- a\n- b')).toBe('<ul><li><p>a</p></li><li><p>b</p></li></ul>')
    expect(drawn('3. c')).toBe('<ol start="3"><li><p>c</p></li></ol>')
    expect(drawn('- [x] done')).toBe('<ul><li><input disabled="" type="checkbox" checked=""> done</li></ul>')
  })

  test('draws tables', () => {
    expect(drawn('| a | b |\n|---|---|\n| c | d |')).toBe(
      '<table><tr><th>a</th><th>b</th></tr><tr><td>c</td><td>d</td></tr></table>',
    )
  })

  test('draws what escapes, entities, rule lines and hard breaks stand for', () => {
    expect(drawn(String.raw`\* &amp;`)).toBe('<p><span>*</span> <span>&amp;</span></p>')
    expect(drawn('a\n\n---')).toBe('<p>a</p><hr>')
    expect(drawn('a\\\nb')).toBe('<p>a<br>b</p>')
  })
})

describe('the markdown look, edited', () => {
  test('draws phrasing HTML elements in the editor, and leaves block ones to the reader', () => {
    const grammar = markdownGrammar()
    const doc = '<div>\nq\n</div>\n\na <b>b</b>'
    const state = EditorState.create({
      doc,
      extensions: new Language(defineLanguageFacet(), grammar, [], 'md').extension,
    })
    ensureSyntaxTree(state, doc.length, 1000)
    const { decorations } = inlineDecorations(state, [{ from: 0, to: doc.length }], markdownLook(policy))
    /** @type {string[]} */
    const tags = []
    decorations.between(0, doc.length, (from, to, value) => {
      /** @type {unknown} */
      const spec = value.spec
      if (typeof spec === 'object' && spec !== null && 'tagName' in spec && typeof spec.tagName === 'string') {
        tags.push(`${spec.tagName}:${doc.slice(from, to)}`)
      }
    })
    expect(tags).toEqual(['b:<b>b</b>'])
  })
})
