import { describe, expect, test } from 'bun:test'

import { renderToString } from './render-string.js'
import { html, repeat } from './template.js'

describe('renderToString', () => {
  test('fills and marks each hole, leaving out properties and events', () => {
    const markup = renderToString(
      html`<ul class=${'a&"b'} hidden=${false} open=${true} .value=${'1'} @click=${() => undefined}
        >${'<x>'}</ul
      >`,
    )
    expect(markup).toBe('<!--i[--><!--i@--><ul class="a&amp;&quot;b" open=""><!--i[-->&lt;x&gt;<!--i]--></ul><!--i]-->')
  })

  test('keeps an empty attribute and leaves out a missing one', () => {
    expect(renderToString(html`<p title=${''} lang=${undefined}></p>`)).toBe(
      '<!--i[--><!--i@--><p title=""></p><!--i]-->',
    )
  })

  test('marks nested templates and each repeated item', () => {
    const items = ['a', 'b']
    const markup = renderToString(
      html`<ol
        >${repeat(
          items,
          (item) => item,
          (item) => html`<li>${item}</li>`,
        )}</ol
      >`,
    )
    expect(markup).toBe(
      '<!--i[--><ol><!--i[--><!--i[--><li><!--i[-->a<!--i]--></li><!--i]--><!--i[--><li><!--i[-->b<!--i]--></li><!--i]--><!--i]--></ol><!--i]-->',
    )
  })

  test('rejects values a hole cannot take', () => {
    expect(() => renderToString(html`<p class=${html`<b></b>`}></p>`)).toThrow('Attribute "class"')
    expect(() => renderToString(html`<p>${() => undefined}</p>`)).toThrow('Child content')
  })
})
