import { expect, test } from 'bun:test'

import { identity } from './target.js'

test('internal identity keeps opaque keys and composed paths distinct without DOM naming', () => {
  expect(identity({ owner: ['list'], part: 'option', item: 1 })).not.toBe(
    identity({ owner: ['list'], part: 'option', item: '1' }),
  )
  expect(identity({ owner: ['a-b'], part: 'c', item: null })).not.toBe(
    identity({ owner: ['a'], part: 'b-c', item: null }),
  )
})
