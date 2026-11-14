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
    document.body.append(element)
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
 * Lays an element out 100 by 30, drawn where its translate takes it from there, as a browser draws it
 * @param {HTMLElement} element - The element
 * @param {() => Readonly<{ x: number, y: number }>} at - Where it is laid out
 * @returns {void}
 */
function layOut(element, at) {
  element.getBoundingClientRect = () => {
    const [x = 0, y = 0] = element.style.translate.split(' ').map((part) => Number(part.replace(/px$/u, '')) || 0)
    return new globalThis.window.DOMRect(at().x + x, at().y + y, 100, 30)
  }
}

/**
 * Stands in for an element's animations, keeping the keyframes of each
 * @param {HTMLElement} element - The element
 * @returns {Readonly<{ slid: unknown[], last: () => EventTarget | undefined }>} The keyframes, and the last animation
 */
function animated(element) {
  /** @type {unknown[]} */
  const slid = []
  /** @type {EventTarget | undefined} */
  let last = undefined
  Object.assign(element, {
    /**
     * @param {unknown} keyframes - Where it slides
     * @returns {EventTarget} The animation
     */
    animate(keyframes) {
      slid.push(keyframes)
      last = Object.assign(new EventTarget(), { cancel: () => undefined, playState: 'running' })
      return last
    },
  })
  return { last: () => last, slid }
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

/**
 * The element drawn for a key
 * @param {ReadonlyMap<string, HTMLElement>} elements - The elements
 * @param {string} key - The key
 * @returns {HTMLElement} Its element
 */
function elementOf(elements, key) {
  const element = elements.get(key)
  if (element === undefined) {
    throw new Error(`${key} is drawn`)
  }
  return element
}

describe('follow', () => {
  test('draws the dragged item along with the pointer, along its axis, until the drag ends', () => {
    const followed = follow({ axis: 'x', duration: 0 })
    const elements = drawn(['a', 'b'], followed)
    const a = elementOf(elements, 'a')
    layOut(a, () => ({ x: 0, y: 0 }))
    followed.showing(undefined, motion(40, 'moving'))
    expect(a.style.translate).toBe('30px 0px')
    followed.showing(undefined, motion(55, 'moving'))
    expect(a.style.translate).toBe('45px 0px')
    expect(elementOf(elements, 'b').style.translate).toBe('')
    followed.showing(undefined, motion(55, 'dropped'))
    followed.showing(undefined, motion(55, 'ended'))
    expect(a.style.translate).toBe('')
  })

  test('keeps the dragged item under a still pointer when what it is in moves under it', () => {
    const followed = follow({ duration: 0 })
    const a = elementOf(drawn(['a'], followed), 'a')
    let left = 0
    layOut(a, () => ({ x: left, y: 0 }))
    followed.showing(undefined, motion(40, 'moving'))
    const before = a.getBoundingClientRect().left
    left = -50
    followed.showing(undefined, motion(40, 'moving'))
    expect(a.getBoundingClientRect().left).toBe(before)
    expect(a.style.translate).toBe('80px 15px')
  })

  test('slides from where it was let go to where it is laid out once the drag ends, marked while it slides', () => {
    const followed = follow({ duration: 100 })
    const a = elementOf(drawn(['a'], followed), 'a')
    let left = 0
    layOut(a, () => ({ x: left, y: 0 }))
    const { last, slid } = animated(a)
    followed.showing(undefined, motion(40, 'moving'))
    expect(a.style.translate).toBe('30px 15px')
    followed.showing(undefined, motion(40, 'dropped'))
    left = 110
    followed.showing(undefined, motion(40, 'ended'))
    expect(slid).toEqual([[{ translate: '-80px 15px' }, { translate: '0px 0px' }]])
    expect(a.dataset['settling']).toBe('')
    last()?.dispatchEvent(new Event('finish'))
    expect('settling' in a.dataset).toBe(false)
  })

  test('a cancelled drag slides back to where it started, and draws the item until it is back', () => {
    const followed = follow({ duration: 100 })
    const elements = drawn(['a', 'b'], followed)
    const a = elementOf(elements, 'a')
    layOut(a, () => ({ x: 0, y: 0 }))
    const { last, slid } = animated(a)
    expect(followed.has('a')).toBe(false)
    followed.showing(undefined, motion(40, 'moving'))
    expect(followed.has('a')).toBe(true)
    followed.showing(undefined, motion(40, 'cancelled'))
    expect(followed.has('a')).toBe(true)
    followed.showing(undefined, motion(40, 'ended'))
    expect(a.style.translate).toBe('')
    expect(slid).toEqual([[{ translate: '30px 15px' }, { translate: '0px 0px' }]])
    expect(followed.has('a')).toBe(true)
    expect(followed.has('b')).toBe(false)
    Object.assign(last() ?? {}, { playState: 'finished' })
    last()?.dispatchEvent(new Event('finish'))
    expect(followed.has('a')).toBe(false)
  })

  test('takes an item grabbed while it slides from where it is drawn, and stops its slide', () => {
    const followed = follow({ duration: 100 })
    const a = elementOf(drawn(['a'], followed), 'a')
    const { last } = animated(a)
    let left = 0
    layOut(a, () => ({ x: left, y: 0 }))
    followed.showing(undefined, motion(40, 'moving'))
    followed.showing(undefined, motion(40, 'dropped'))
    left = 110
    followed.showing(undefined, motion(40, 'ended'))
    let cancelled = false
    Object.assign(last() ?? {}, {
      cancel: () => {
        cancelled = true
      },
    })
    a.getBoundingClientRect = () => new globalThis.window.DOMRect(70, 0, 100, 30)
    followed.showing(undefined, motion(20, 'moving'))
    expect(cancelled).toBe(true)
    expect('settling' in a.dataset).toBe(false)
    layOut(a, () => ({ x: left, y: 0 }))
    followed.showing(undefined, motion(20, 'moving'))
    expect(a.getBoundingClientRect().left).toBe(80)
  })
})

/**
 * Four items 100 wide with 10 between, across a row
 * @returns {Readonly<{ room: ReturnType<typeof makeRoom<string>>, shifts: () => string[] }>} The facet, and each
 *   item's translate
 */
function row() {
  const keys = ['a', 'b', 'c', 'd']
  const room = makeRoom({ axis: 'x', duration: 0, rank: { rank: (/** @type {string} */ key) => keys.indexOf(key) } })
  const elements = drawn(keys, room)
  for (const [index, element] of [...elements.values()].entries()) {
    layOut(element, () => ({ x: index * 110, y: 0 }))
  }
  return { room, shifts: () => [...elements.values()].map((element) => element.style.translate) }
}

describe('makeRoom', () => {
  test('moves the items a drag would pass one place back, and back again once a cancelled drag ends', () => {
    const { room, shifts } = row()
    room.showing(undefined, motion(20, 'moving'))
    expect(shifts()).toEqual(['', '', '', ''])
    room.showing({ after: true, key: 'a', target: 'c' }, motion(240, 'moving'))
    expect(shifts()).toEqual(['', '-110px 0px', '-110px 0px', ''])
    room.showing({ after: false, key: 'a', target: 'c' }, motion(130, 'moving'))
    expect(shifts()).toEqual(['', '-110px 0px', '', ''])
    room.showing(undefined, motion(130, 'cancelled'))
    expect(shifts()).toEqual(['', '-110px 0px', '', ''])
    room.showing(undefined, motion(130, 'ended'))
    expect(shifts()).toEqual(['', '', '', ''])
  })

  test('draws the items it moves aside until they are back, a cancelled drag sliding them back', () => {
    const keys = ['a', 'b', 'c']
    const room = makeRoom({
      axis: 'x',
      duration: 100,
      rank: { rank: (/** @type {string} */ key) => keys.indexOf(key) },
    })
    const elements = drawn(keys, room)
    /** @type {Map<string, ReturnType<typeof animated>>} */
    const slides = new Map()
    for (const [index, [key, element]] of [...elements].entries()) {
      layOut(element, () => ({ x: index * 110, y: 0 }))
      slides.set(key, animated(element))
    }
    room.showing({ after: true, key: 'a', target: 'b' }, motion(130, 'moving'))
    expect([room.has('a'), room.has('b'), room.has('c')]).toEqual([false, true, false])
    expect(slides.get('b')?.slid).toEqual([[{ translate: '0px 0px' }, { translate: '-110px 0px' }]])
    room.showing(undefined, motion(130, 'cancelled'))
    room.showing(undefined, motion(130, 'ended'))
    expect(elementOf(elements, 'b').style.translate).toBe('')
    expect(slides.get('b')?.slid.at(-1)).toEqual([{ translate: '-110px 0px' }, { translate: '0px 0px' }])
    expect(room.has('b')).toBe(true)
    Object.assign(slides.get('b')?.last() ?? {}, { playState: 'finished' })
    expect(room.has('b')).toBe(false)
  })

  test('keeps the room made through a drop until the drag ends', () => {
    const { room, shifts } = row()
    const d = { ...motion(0, 'moving'), key: 'd' }
    room.showing({ after: false, key: 'd', target: 'b' }, d)
    expect(shifts()).toEqual(['', '110px 0px', '110px 0px', ''])
    room.showing(undefined, { ...d, phase: 'dropped' })
    expect(shifts()).toEqual(['', '110px 0px', '110px 0px', ''])
    room.showing(undefined, { ...d, phase: 'ended' })
    expect(shifts()).toEqual(['', '', '', ''])
  })
})
