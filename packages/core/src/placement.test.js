/** @import { Wanted } from './placement.js' */

import { describe, expect, test } from 'bun:test'

import { place } from './placement.js'

/** @type {Wanted} */
const BELOW = {
  align: 'start',
  anchor: { height: 20, width: 80, x: 100, y: 100 },
  bounds: { height: 600, width: 800, x: 0, y: 0 },
  direction: 'ltr',
  gap: 4,
  margin: 8,
  side: 'block-end',
  size: { height: 50, width: 120 },
}

/** @type {Wanted} */
const SUBMENU_NEAR_RIGHT = {
  ...BELOW,
  anchor: { height: 24, width: 160, x: 600, y: 100 },
  side: 'inline-end',
}

/** @type {Wanted} */
const SUBMENU_RIGHT_TO_LEFT = {
  ...BELOW,
  anchor: { height: 24, width: 160, x: 400, y: 100 },
  direction: 'rtl',
  side: 'inline-end',
}

describe('place, on the side wanted', () => {
  test('puts it there, lined up with the anchor, a gap away', () => {
    expect(place(BELOW)).toEqual({ available: { height: 468, width: 784 }, side: 'block-end', x: 100, y: 124 })
  })

  test('lines it up at the centre or the end', () => {
    expect(place({ ...BELOW, align: 'center' })).toMatchObject({ x: 80 })
    expect(place({ ...BELOW, align: 'end' })).toMatchObject({ x: 60 })
  })

  test('lines up start with the right edge when text runs right to left', () => {
    expect(place({ ...BELOW, direction: 'rtl' })).toMatchObject({ x: 60 })
  })

  test('anchors to a point, a rectangle of no size', () => {
    const point = { ...BELOW, anchor: { height: 0, width: 0, x: 300, y: 200 } }
    expect(place(point)).toMatchObject({ side: 'block-end', x: 300, y: 204 })
  })
})

describe('place, keeping inside the area', () => {
  test('flips to the other side when only that one has room', () => {
    const nearBottom = { ...BELOW, anchor: { ...BELOW.anchor, y: 560 } }
    expect(place(nearBottom)).toEqual({ available: { height: 548, width: 784 }, side: 'block-start', x: 100, y: 506 })
  })

  test('stays on the side wanted when neither has room but it has more, and says how much it has', () => {
    const tall = { ...BELOW, anchor: { ...BELOW.anchor, y: 250 }, size: { height: 400, width: 120 } }
    expect(place(tall)).toMatchObject({ available: { height: 318 }, side: 'block-end', y: 192 })
  })

  test('moves along the side to stay inside the area, by the margin', () => {
    const nearRight = { ...BELOW, anchor: { ...BELOW.anchor, x: 760 } }
    expect(place(nearRight)).toMatchObject({ x: 672 })
  })
})

describe('place, in the inline direction', () => {
  test('goes after the anchor, or before it when only that side has room', () => {
    expect(place(SUBMENU_NEAR_RIGHT)).toEqual({
      available: { height: 584, width: 588 },
      side: 'inline-start',
      x: 476,
      y: 100,
    })
    expect(place({ ...SUBMENU_NEAR_RIGHT, anchor: { ...SUBMENU_NEAR_RIGHT.anchor, x: 100 } })).toEqual({
      available: { height: 584, width: 528 },
      side: 'inline-end',
      x: 264,
      y: 100,
    })
  })

  test('takes inline-end as the left when text runs right to left', () => {
    expect(place(SUBMENU_RIGHT_TO_LEFT)).toMatchObject({ side: 'inline-end', x: 276 })
  })
})
