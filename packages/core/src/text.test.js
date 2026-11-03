import { describe, expect, test } from 'bun:test'

import { plainText, startsWithTyped } from './text.js'

const ANSWER = 42

describe('startsWithTyped', () => {
  test('matches from the start, ignoring case and accents', () => {
    expect(startsWithTyped('Émile', 'em')).toBe(true)
    expect(startsWithTyped('banana', 'BAN')).toBe(true)
    expect(startsWithTyped('  cherry', 'ch')).toBe(true)
  })

  test("doesn't match inside the text, or more than it has", () => {
    expect(startsWithTyped('banana', 'nan')).toBe(false)
    expect(startsWithTyped('fig', 'figs')).toBe(false)
  })
})

describe('plainText', () => {
  test('is a string or number as itself, and anything else as nothing', () => {
    expect(plainText('fig')).toBe('fig')
    expect(plainText(ANSWER)).toBe('42')
    expect(plainText({ name: 'fig' })).toBe('')
  })
})
