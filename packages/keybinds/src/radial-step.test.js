import { describe, expect, test } from 'bun:test'

import { radialPlace } from './radial-place.js'
import { radialStep } from './radial-step.js'

const FULL = ['s0', 's1', 's2', 's3', 's4', 's5', 's6', 's7']
const THREE = ['s0', 's1', 's2']

/** @type {readonly string[]} */
const EMPTY = []

describe('toward a direction', () => {
  test.each([
    [0, 's0'],
    [2, 's2'],
    [4, 's4'],
    [6, 's6'],
  ])('is the slot pointed at (%d), when every slot is filled', (slot, key) => {
    expect(radialStep(() => FULL).toward(slot)).toBe(key)
  })

  test('is the nearest filled one, clockwise first, when the one pointed at is empty; nothing when none is', () => {
    const slots = radialStep(() => THREE)
    expect([slots.toward(4), slots.toward(6)]).toEqual(['s2', 's0'])
    expect(radialStep(() => EMPTY).toward(0)).toBeUndefined()
  })
})

describe('round the slots', () => {
  test('goes on from a slot and back, round the filled ones, from the first or the last with none', async () => {
    const { step } = radialStep(() => THREE)
    expect(await Promise.all([step(undefined, 1), step('s2', 1), step('s0', -1), step(undefined, -1)])).toEqual([
      's0',
      's0',
      's2',
      's2',
    ])
    expect(await radialStep(() => EMPTY).step(undefined, 1)).toBeUndefined()
  })
})

describe('radialPlace', () => {
  test('puts eight squares round the centre of the box that holds them, the first at the top, on clockwise', () => {
    const layout = radialPlace({ radius: 50, size: 10 })
    const at = (/** @type {number} */ rank) => {
      const { height, width, x, y } = layout.place(rank)
      return [Math.round(x), Math.round(y), width, height]
    }
    expect([layout.extent, at(0), at(2), at(4), at(6)]).toEqual([
      110,
      [50, 0, 10, 10],
      [100, 50, 10, 10],
      [50, 100, 10, 10],
      [0, 50, 10, 10],
    ])
  })
})
