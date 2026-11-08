import { describe, expect, test } from 'bun:test'

import { arrayList } from './array-list.js'
import { arrayReorder } from './array-reorder.js'
import { drag } from './drag.js'

describe('arrayReorder', () => {
  test('moves a key just before or after another, keeping what is held', () => {
    const list = arrayList(['a', 'b', 'c', 'd'])
    const active = list.hold('a', 'next')
    const reorder = arrayReorder(list)
    reorder('a', 'c', true)
    expect(list.keys()).toEqual(['b', 'c', 'a', 'd'])
    reorder('d', 'b', false)
    expect(list.keys()).toEqual(['d', 'b', 'c', 'a'])
    reorder('a', 'z', true)
    expect(list.keys()).toEqual(['d', 'b', 'c', 'a'])
    expect(active.get()).toBe('a')
  })
})

/**
 * A pointer event on an element
 * @param {Element} target - Where
 * @param {string} type - Which
 * @param {number} x - Where across
 * @returns {void}
 */
function point(target, type, x) {
  target.dispatchEvent(new PointerEvent(type, { bubbles: true, button: 0, clientX: x, clientY: 0, pointerId: 1 }))
}

/**
 * Items a and b in a container, dragged
 * @returns {Readonly<{ element: Element, a: HTMLElement, moves: string[], shown: string[], picked: string[] }>} What
 *   happened
 */
function dragged() {
  const element = document.createElement('div')
  const a = document.createElement('div')
  element.append(a)
  document.body.append(element)
  element.setPointerCapture = () => undefined
  /** @type {string[]} */
  const moves = []
  /** @type {string[]} */
  const shown = []
  /** @type {string[]} */
  const picked = []
  element.addEventListener('click', () => {
    picked.push('click')
  })
  drag({
    element,
    gap: ({ x }) => ({ after: x > 50, target: x > 20 ? 'b' : 'a' }),
    itemOf: (target) => (target === a ? { key: 'a' } : undefined),
    reorder: (key, target, after) => {
      moves.push(`${key}->${after ? 'after' : 'before'} ${target}`)
    },
    showing: (at) => {
      shown.push(at === undefined ? 'none' : `${at.target}:${String(at.after)}`)
    },
  })
  return { a, element, moves, picked, shown }
}

describe('drag', () => {
  test('drags an item once the pointer moves a few pixels, shows where it would land, and moves it on release', () => {
    const { a, moves, picked, shown } = dragged()
    point(a, 'pointerdown', 0)
    point(a, 'pointermove', 2)
    point(a, 'pointermove', 10)
    point(a, 'pointermove', 60)
    point(a, 'pointerup', 60)
    a.click()
    a.click()
    expect(shown).toEqual(['none', 'b:true', 'none'])
    expect(moves).toEqual(['a->after b'])
    expect(picked).toEqual(['click'])
  })

  test('leaves a plain click alone, and moves nothing when cancelled', () => {
    const { a, moves, picked } = dragged()
    point(a, 'pointerdown', 0)
    point(a, 'pointerup', 0)
    a.click()
    point(a, 'pointerdown', 0)
    point(a, 'pointermove', 60)
    point(a, 'pointercancel', 60)
    expect(moves).toEqual([])
    expect(picked).toEqual(['click'])
  })

  test('asks again where the drag would land when anything scrolls under a still pointer', () => {
    const element = document.createElement('div')
    const a = document.createElement('div')
    element.append(a)
    document.body.append(element)
    element.setPointerCapture = () => undefined
    let scrolled = 0
    /** @type {string[]} */
    const moves = []
    drag({
      element,
      gap: () => ({ after: true, target: scrolled > 0 ? 'far' : 'near' }),
      itemOf: (target) => (target === a ? { key: 'a' } : undefined),
      reorder: (key, target) => {
        moves.push(`${key}->${target}`)
      },
      showing: () => undefined,
    })
    point(a, 'pointerdown', 0)
    point(a, 'pointermove', 60)
    scrolled += 1
    document.dispatchEvent(new Event('scroll'))
    point(a, 'pointerup', 60)
    expect(moves).toEqual(['a->far'])
  })
})
