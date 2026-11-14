import { describe, expect, test } from 'bun:test'

import { follow } from './follow.js'
import { makeRoom } from './make-room.js'

/**
 * Elements for keys, each `apply`d again for the keys a facet reports, as render does
 * @param {readonly string[]} keys - The keys
 * @param {Readonly<{ apply: (key: string, element: Element) => void,
 *   watch: (listener: (keys?: readonly string[]) => void) => () => void }>} facet - The facet
 * @returns {Map<string, HTMLElement>} Each key's element
 */
function drawn(keys, facet) {
  /** @type {Map<string, HTMLElement>} */
  const elements = new Map()
  for (const key of keys) {
    const element = document.createElement('div')
    elements.set(key, element)
    facet.apply(key, element)
  }
  facet.watch((changed) => {
    for (const key of changed ?? keys) {
      const element = elements.get(key)
      if (element !== undefined) {
        facet.apply(key, element)
      }
    }
  })
  return elements
}

/**
 * A drag's motion
 * @param {number} x - Where the pointer is across
 * @param {'moving' | 'dropped' | 'cancelled' | 'ended'} phase - How the drag stands
 * @returns {import('./drag.js').Motion<string>} The motion
 */
function motion(x, phase) {
  return { from: { x: 10, y: 10 }, key: 'a', phase, point: { x, y: 25 } }
}

describe('follow', () => {
  test('draws the dragged item along with the pointer, along its axis, until the drag ends', () => {
    const followed = follow({ axis: 'x', duration: 0 })
    const elements = drawn(['a', 'b'], followed)
    followed.show(undefined, motion(40, 'moving'))
    expect(elements.get('a')?.style.translate).toBe('30px 0px')
    followed.show(undefined, motion(55, 'moving'))
    expect(elements.get('a')?.style.translate).toBe('45px 0px')
    expect(elements.get('b')?.style.translate).toBe('')
    followed.show(undefined, motion(55, 'dropped'))
    followed.show(undefined, motion(55, 'ended'))
    expect(elements.get('a')?.style.translate).toBe('')
  })

  test('slides from where it was let go to where it is laid out after the reorder', () => {
    const followed = follow({ duration: 100 })
    const elements = drawn(['a'], followed)
    const a = elements.get('a')
    if (a === undefined) {
      throw new Error('a is drawn')
    }
    let left = 45
    a.getBoundingClientRect = () => new globalThis.window.DOMRect(left, 15, 100, 30)
    /** @type {unknown[]} */
    const slid = []
    Object.assign(a, {
      /**
       * @param {unknown} keyframes - Where it slides
       * @returns {Readonly<{ cancel: () => void }>} The animation
       */
      animate(keyframes) {
        slid.push(keyframes)
        return { cancel: () => undefined }
      },
    })
    followed.show(undefined, motion(40, 'moving'))
    expect(a.style.translate).toBe('30px 15px')
    followed.show(undefined, motion(40, 'dropped'))
    left = 110
    followed.show(undefined, motion(40, 'ended'))
    expect(slid).toEqual([[{ translate: '-65px 0px' }, { translate: '0px 0px' }]])
  })
})

/**
 * Four items 100 wide with 10 between, across a row
 * @returns {Readonly<{ room: ReturnType<typeof makeRoom<string>>, shifts: () => string[] }>} The facet, and each
 *   item's translate
 */
function row() {
  const keys = ['a', 'b', 'c', 'd']
  const room = makeRoom({ axis: 'x', duration: 0, rank: (/** @type {string} */ key) => keys.indexOf(key) })
  const elements = drawn(keys, room)
  for (const [index, element] of [...elements.values()].entries()) {
    element.getBoundingClientRect = () => new globalThis.window.DOMRect(index * 110, 0, 100, 30)
  }
  return { room, shifts: () => [...elements.values()].map((element) => element.style.translate) }
}

describe('makeRoom', () => {
  test('moves the items a drag would pass one place back, and back again when it is cancelled', () => {
    const { room, shifts } = row()
    room.show(undefined, motion(20, 'moving'))
    expect(shifts()).toEqual(['', '', '', ''])
    room.show({ after: true, key: 'a', target: 'c' }, motion(240, 'moving'))
    expect(shifts()).toEqual(['', '-110px 0px', '-110px 0px', ''])
    room.show({ after: false, key: 'a', target: 'c' }, motion(130, 'moving'))
    expect(shifts()).toEqual(['', '-110px 0px', '', ''])
    room.show(undefined, motion(130, 'cancelled'))
    expect(shifts()).toEqual(['', '', '', ''])
  })

  test('keeps the room made through a drop until the drag ends', () => {
    const { room, shifts } = row()
    const d = { ...motion(0, 'moving'), key: 'd' }
    room.show({ after: false, key: 'd', target: 'b' }, d)
    expect(shifts()).toEqual(['', '110px 0px', '110px 0px', ''])
    room.show(undefined, { ...d, phase: 'dropped' })
    expect(shifts()).toEqual(['', '110px 0px', '110px 0px', ''])
    room.show(undefined, { ...d, phase: 'ended' })
    expect(shifts()).toEqual(['', '', '', ''])
  })
})
