import { describe, expect, test } from 'bun:test'

import { findPrefix } from './find-prefix.js'
import { MemorySource } from './memory-source.js'

describe('findPrefix', () => {
  test('is answered by a source that searches its text, and not by one that does not', () => {
    const fruit = new MemorySource(['apple', 'banana', 'blueberry'], (item) => item)
    expect(findPrefix.ask(fruit, { from: 2, text: 'b' })).toEqual({ answer: 2 })
    const plain = { count: () => 0, key: String, read: () => [], subscribe: () => () => undefined }
    expect(findPrefix.ask(plain, { from: 0, text: 'b' })).toBeUndefined()
  })
})
