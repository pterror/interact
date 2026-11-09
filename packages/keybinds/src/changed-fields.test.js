import { describe, expect, test } from 'bun:test'

import { changedFields } from './changed-fields.js'

describe('changedFields', () => {
  test('keeps the fields whose bindings differ from the defaults, and only those', () => {
    const defaults = { keys: ['$mod+o'], mouse: ['$mod+click'] }
    expect(changedFields(defaults, { keys: ['$mod+o'], mouse: [] })).toEqual({ mouse: [] })
    expect(changedFields(defaults, { keys: ['$mod+p', '$mod+o'] })).toEqual({ keys: ['$mod+p', '$mod+o'] })
    expect(changedFields(defaults, { keys: ['$mod+o'], mouse: ['$mod+click'], pad: [] })).toEqual({})
    expect(changedFields(defaults, { pad: ['a'] })).toEqual({ pad: ['a'] })
  })
})
