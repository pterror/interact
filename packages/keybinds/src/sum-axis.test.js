import { describe, expect, test } from 'bun:test'

import { axisWhen } from './axis-when.js'
import { scaleAxis } from './scale-axis.js'
import { sumAxis } from './sum-axis.js'

const at = (/** @type {number} */ position, /** @type {number} */ delta) => () => ({ delta, position })

describe('axes as values', () => {
  test('add up, the position kept from -1 to 1', () => {
    expect(sumAxis([at(1, 2), at(0.5, 3)])()).toEqual({ delta: 5, position: 1 })
    expect(sumAxis([])()).toEqual({ delta: 0, position: 0 })
  })

  test('scale, and read zero while they do not apply, read all the same', () => {
    let reads = 0
    const counted = () => {
      reads += 1
      return { delta: 4, position: 0.5 }
    }
    expect(scaleAxis(counted, -1)()).toEqual({ delta: -4, position: -0.5 })
    expect([axisWhen(counted, () => false)(), reads]).toEqual([{ delta: 0, position: 0 }, 2])
  })
})
