import { describe, expect, test } from 'bun:test'

import { formatAxisParts } from './axes-ui.js'

describe('formatAxisParts', () => {
  test('shows mouse, stick and key sources, and an inversion', () => {
    expect(formatAxisParts('mouse:x')).toEqual(['Mouse ↔'])
    expect(formatAxisParts('-pad:ry')).toEqual(['Right stick ↕', 'Inverted'])
    expect(formatAxisParts('keys:a/d')).toEqual(['A', '/', 'D'])
  })

  test('shows a source it can not read as written', () => {
    expect(formatAxisParts('mouse:z')).toEqual(['mouse:z'])
  })
})
