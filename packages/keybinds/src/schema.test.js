import { describe, expect, test } from 'bun:test'

import { defineSchema, idsOf, isId, withOverride } from './schema.js'

const SCHEMA = defineSchema({
  open: { keys: ['$mod+o'], label: 'Open', mouse: ['$mod+Click'] },
  save: { keys: ['$mod+s'], label: 'Save' },
})

describe('withOverride', () => {
  test('lays each field an override sets over one binding, leaving the rest', () => {
    expect(withOverride(SCHEMA.open, { keys: ['$mod+p'] })).toEqual({
      keys: ['$mod+p'],
      label: 'Open',
      mouse: ['$mod+Click'],
    })
    expect(withOverride(SCHEMA.save, undefined)).toBe(SCHEMA.save)
  })
})

describe('ids', () => {
  test("are a schema's own keys, in its order, and nothing it inherits", () => {
    expect(idsOf(SCHEMA)).toEqual(['open', 'save'])
    expect([isId(SCHEMA, 'save'), isId(SCHEMA, 'toString'), isId(SCHEMA, 'sav')]).toEqual([true, false, false])
  })
})
