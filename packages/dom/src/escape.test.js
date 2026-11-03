import { describe, expect, test } from 'bun:test'

import { escapeAttribute, escapeText } from './escape.js'

describe('escape', () => {
  test('escapes what text and attributes need, and nothing else', () => {
    expect(escapeText(`a & <b> "c" 'd'`)).toBe(`a &amp; &lt;b&gt; "c" 'd'`)
    expect(escapeAttribute(`a & <b> "c" 'd'`)).toBe(`a &amp; &lt;b&gt; &quot;c&quot; 'd'`)
  })
})
