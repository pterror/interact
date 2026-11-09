import { describe, expect, test } from 'bun:test'

import { bound } from './bound.js'

const SCHEMA = {
  open: { keys: ['$mod+o'], label: 'Open', mouse: ['$mod+Click'] },
  save: { keys: ['$mod+s'], label: 'Save' },
}

describe('bound', () => {
  test("lays each field an override sets over its id's entry, in the schema's order, leaving the rest", () => {
    const now = bound(SCHEMA, { nonexistent: { keys: ['a'] }, open: { keys: ['$mod+p'] } })
    expect(Object.keys(now)).toEqual(['open', 'save'])
    expect(now['open']).toEqual({ keys: ['$mod+p'], label: 'Open', mouse: ['$mod+Click'] })
    expect(now['save']).toBe(SCHEMA.save)
  })
})
