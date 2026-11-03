import { describe, expect, test } from 'bun:test'

import { insideArea, intentArea } from './intent.js'

const SUBMENU = { height: 100, width: 80, x: 200, y: 50 }
const LEFT_OF_IT = { x: 190, y: 120 }
const ON_THE_LEFT = { height: 100, width: 80, x: 20, y: 50 }

describe('intentArea', () => {
  const area = intentArea(LEFT_OF_IT, SUBMENU)

  test('holds the way diagonally toward a submenu on the right, and the submenu', () => {
    expect([
      insideArea({ x: 195, y: 100 }, area),
      insideArea({ x: 198, y: 60 }, area),
      insideArea({ x: 250, y: 140 }, area),
    ]).toEqual([true, true, true])
  })

  test('leaves out moving away, or past the submenu', () => {
    expect([
      insideArea({ x: 180, y: 120 }, area),
      insideArea({ x: 195, y: 30 }, area),
      insideArea({ x: 300, y: 100 }, area),
    ]).toEqual([false, false, false])
  })

  test('points the other way for a submenu on the left', () => {
    const leftward = intentArea({ x: 110, y: 120 }, ON_THE_LEFT)
    expect([insideArea({ x: 105, y: 90 }, leftward), insideArea({ x: 120, y: 90 }, leftward)]).toEqual([true, false])
  })
})
