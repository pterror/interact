import { describe, expect, test } from 'bun:test'

import { prepare, tokens } from './prepare.js'

const FIRST = 0
const SECOND = 1
const TWO = 2

/**
 * A template's static strings, as a tag sees them.
 * @param {TemplateStringsArray} statics - The static strings
 * @param {readonly unknown[]} _values - The holes' values, which prepare doesn't read
 * @returns {TemplateStringsArray} The same strings
 */
function strings(statics, ..._values) {
  return statics
}

/**
 * A template run with a value, to show it is the same strings each time.
 * @param {string} value - Its one value
 * @returns {TemplateStringsArray} Its strings
 */
function once(value) {
  return strings`<p>${value}</p>`
}

describe('prepare', () => {
  test('finds attribute, property, event and child holes in order', () => {
    const found = prepare(strings`<ul class=${'a'}><li .value=${'b'} @click="${'c'}" hidden>${'d'}</li>${'e'}</ul>`)
    expect(found.holes).toEqual([
      { element: FIRST, kind: 'attribute', name: 'class' },
      { element: SECOND, kind: 'property', name: 'value' },
      { element: SECOND, kind: 'event', name: 'click' },
      { child: FIRST, kind: 'child' },
      { child: SECOND, kind: 'child' },
    ])
    expect(found.elements).toBe(TWO)
    expect(found.children).toBe(TWO)
    expect(found.pieces).toEqual(['<!--i@--><ul', '><!--i@--><li', '', ' hidden>', '</li>', '</ul>'])
  })

  test('keeps the case of a property name, which the HTML parser would lower', () => {
    expect(prepare(strings`<input .selectionStart=${'a'}>`).holes).toEqual([
      { element: FIRST, kind: 'property', name: 'selectionStart' },
    ])
  })

  test('remembers a template by its strings', () => {
    expect(prepare(once('a'))).toBe(prepare(once('b')))
  })

  test('reads raw text elements as text, and comments as comments', () => {
    const found = prepare(strings`<style>a<b {}</style><!-- <p class=x> --><p>${'a'}</p>`)
    expect(found.pieces).toEqual(['<style>a<b {}</style><!-- <p class=x> --><p>', '</p>'])
  })

  test.each([
    ['part of an attribute value', () => prepare(strings`<p class="a ${'a'}"></p>`), 'whole attribute value'],
    ['an attribute name', () => prepare(strings`<p ${'a'}=x></p>`), "attribute's name"],
    ['a bare hole in a tag', () => prepare(strings`<p ${'a'}></p>`), 'stand alone in a tag'],
    ['a comment', () => prepare(strings`<!-- ${'a'} -->`), 'in a comment'],
    ['raw text', () => prepare(strings`<textarea>${'a'}</textarea>`), 'inside <script>'],
  ])('rejects a hole in %s', (_what, run, message) => {
    expect(run).toThrow(message)
  })
})

describe('tokens', () => {
  test('splits markup into comments, tags, text and raw text', () => {
    expect(tokens('<p a="<b>">x<!-- <i> --></p><style>a<b</style>').map(({ kind, text }) => `${kind}:${text}`)).toEqual(
      ['start:<p a="<b>">', 'text:x', 'comment:<!-- <i> -->', 'end:</p>', 'start:<style>', 'raw:a<b', 'end:</style>'],
    )
  })

  test('ends raw text at its own end tag, whatever it holds', () => {
    expect(tokens('<script><!-- </script><p>').map(({ kind }) => kind)).toEqual(['start', 'raw', 'end', 'start'])
  })
})
