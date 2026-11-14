import { describe, expect, test } from 'bun:test'

import { arrayStep } from './array-step.js'
import { wrapStep } from './wrap-step.js'

describe('arrayStep', () => {
  const step = arrayStep(() => ['a', 'b', 'c', 'd'])

  test('steps from an edge', async () => {
    expect(await step(undefined, 1)).toBe('a')
    expect(await step(undefined, -1)).toBe('d')
    expect(await step(undefined, 2)).toBe('b')
  })

  test('steps from a key, stopping at the ends', async () => {
    expect(await step('b', 1)).toBe('c')
    expect(await step('b', -1)).toBe('a')
    expect(await step('c', 5)).toBe('d')
    expect(await step('b', -5)).toBe('a')
  })

  test('steps from a key it lacks as from an edge, and gives none for no keys', async () => {
    expect(await step('z', 1)).toBe('a')
    /** @type {readonly string[]} */
    const none = []
    const found = await arrayStep(() => none)(undefined, 1)
    expect(found).toBeUndefined()
  })
})

describe('wrapStep', () => {
  const step = wrapStep(arrayStep(() => ['a', 'b', 'c']))

  test('goes to the other edge from a key at the edge it goes towards, and steps as before elsewhere', async () => {
    expect(await step('c', 1)).toBe('a')
    expect(await step('a', -1)).toBe('c')
    expect(await step('a', 1)).toBe('b')
    expect(await step('b', 5)).toBe('c')
    expect(await step(undefined, -1)).toBe('c')
    expect(await step('b', 0)).toBe('b')
  })
})
