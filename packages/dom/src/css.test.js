import { describe, expect, test } from 'bun:test'

import { css, scopedText } from './css.js'

const SHEET = css`
  @layer test {
    :where(:scope) {
      color: red;
    }
  }
`

describe('css', () => {
  test('scopes one text to the shadow host, or to elements of its kind, stopping at components inside', () => {
    const shadow = scopedText(SHEET, 'listbox', 'shadow')
    expect(shadow).toStartWith('@scope (:host) to ([data-interact-view]) {')
    expect(shadow).toContain('@scope (:host > [data-interact-view]) to ([data-interact]) {')
    expect(shadow.slice(shadow.indexOf('@scope (:host > [data-interact-view]) to'))).toContain(':where(:host)')
    expect(scopedText(SHEET, 'listbox', 'light')).toStartWith(
      '@scope ([data-interact="listbox"]) to ([data-interact]) {',
    )
  })

  test('keeps backslashes as written', () => {
    expect(
      css`
        :where(q)::before {
          content: '\201C';
        }
      `.text,
    ).toContain(String.raw`\201C`)
  })

  test('rejects a kind that is not a lowercase name', () => {
    expect(() => scopedText(SHEET, 'List"box', 'light')).toThrow('lowercase')
  })
})
