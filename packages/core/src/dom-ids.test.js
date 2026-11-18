import { expect, test } from 'bun:test'

import { prefixedIds } from './dom-ids.js'

test('automatic DOM ids accept arbitrary keys without collisions or whitespace in ARIA references', () => {
  const naming = prefixedIds('widget')
  const keys = [1, '1', 'a b', 'a-b', 'a/b', '雪']
  const ids = keys.map((item) => naming.idOf({ owner: ['list'], part: 'option', item }))
  expect(new Set(ids).size).toBe(keys.length)
  for (const id of ids) {
    expect(id).not.toMatch(/[\t\n\f\r ]/u)
  }
})
