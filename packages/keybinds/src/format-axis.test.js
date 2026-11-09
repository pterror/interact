import { describe, expect, test } from 'bun:test'

import { formatAxis } from './format-axis.js'

describe('formatAxis', () => {
  test('shows mouse, stick and key sources, and an inversion', () => {
    expect(formatAxis('mouse:x')).toEqual(['Mouse ↔'])
    expect(formatAxis('-pad:ry')).toEqual(['Right stick ↕', 'Inverted'])
    expect(formatAxis('keys:a/d')).toEqual(['A', '/', 'D'])
    expect(formatAxis('keys:a/slash', new Map([['Slash', '-']]))).toEqual(['A', '/', '-'])
  })

  test('shows a source it can not read as written', () => {
    expect(formatAxis('mouse:z')).toEqual(['mouse:z'])
    expect(formatAxis('keys:a')).toEqual(['keys:a'])
  })
})
