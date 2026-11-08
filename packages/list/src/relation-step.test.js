import { describe, expect, test } from 'bun:test'

import { relationStep } from './relation-step.js'

describe('relationStep', () => {
  const parent = relationStep((/** @type {string} */ key) =>
    Promise.resolve(key.includes('/') ? key.slice(0, key.lastIndexOf('/')) : undefined),
  )

  test('takes the hops the source answers, and stays where it has no answer', async () => {
    expect(await parent('a/b/c', 1)).toBe('a/b')
    expect(await parent('a/b/c', 2)).toBe('a')
    expect(await parent('a/b/c', 5)).toBe('a')
    expect(await parent('a', 1)).toBe('a')
    expect(await parent(undefined, 1)).toBeUndefined()
  })
})
