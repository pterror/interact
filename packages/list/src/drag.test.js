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
 * Lets every listener to a change hear it, and what they queued run
 * @returns {Promise<void>} When they have
 */
async function heard() {
  await Promise.resolve()
}

/**
 * Item a in a container, dragged in a list of a, b and c; the pointer over b and c beyond 20 and 40
 * @param {Readonly<{ reorder?: (key: string, target: string, after: boolean) => Promise<boolean> | undefined,
 *   wait?: number }>} [options]
 *   - Moving an item (left out: at once), and how long a drop waits
 * @returns {Readonly<{ a: HTMLElement, list: ReturnType<typeof arrayList<string>>, seen: string[], picked: string[] }>}
 *   What happened
 */
function dragged(options = {}) {
  const element = document.createElement('div')
  const a = document.createElement('div')
  element.append(a)
  document.body.append(element)
  element.setPointerCapture = () => undefined
  const list = arrayList(['a', 'b', 'c'])
  const now = arrayReorder(list)
  /** @type {string[]} */
  const seen = []
  /** @type {string[]} */
  const picked = []
  element.addEventListener('click', () => {
    picked.push('click')
  })
  const {
    reorder = (/** @type {string} */ key, /** @type {string} */ target, /** @type {boolean} */ after) => {
      now(key, target, after)
      return undefined
    },
    wait,
  } = options
  drag({
    drawn: list,
    element,
    held: list.hold(undefined, 'none'),
    gap: ({ x }) => {
      seen.push('asked')
      return { after: true, target: x > 40 ? 'c' : x > 20 ? 'b' : 'a' }
    },
    itemOf: (target) => (target === a ? { key: 'a' } : undefined),
    reorder: (key, target, after) => {
      seen.push(`reorder ${key}->${target}`)
      return reorder(key, target, after)
    },
    showing: (at, { from, key, phase, point: { x } }) => {
      seen.push(`${phase} ${key} ${String(x - from.x)} ${at === undefined ? 'none' : at.target}`)
    },
    ...(wait === undefined ? {} : { wait }),
  })
  return { a, list, picked, seen }
}

describe('drag', () => {
  test('drags once the pointer moves a few pixels, over the item itself too, and ends once the list changes', async () => {
    const { a, list, picked, seen } = dragged()
    point(a, 'pointerdown', 5)
    point(a, 'pointermove', 7)
    point(a, 'pointermove', 15)
    point(a, 'pointermove', 30)
    point(a, 'pointerup', 30)
    await heard()
    a.click()
    a.click()
    expect(seen).toEqual([
      'asked',
      'moving a 10 none',
      'asked',
      'moving a 25 b',
      'dropped a 25 none',
      'reorder a->b',
      'ended a 25 none',
    ])
    expect(list.keys()).toEqual(['b', 'a', 'c'])
    expect(picked).toEqual(['click'])
  })

  test('leaves a plain click alone, and ends a cancelled drag at once, moving nothing', () => {
    const { a, list, picked, seen } = dragged()
    point(a, 'pointerdown', 0)
    point(a, 'pointerup', 0)
    a.click()
    point(a, 'pointerdown', 0)
    point(a, 'pointermove', 60)
    point(a, 'pointercancel', 60)
    expect(seen.slice(-2)).toEqual(['cancelled a 60 none', 'ended a 60 none'])
    expect(list.keys()).toEqual(['a', 'b', 'c'])
    expect(picked).toEqual(['click'])
  })

  test('ends a drop only once a late reorder changes the list', async () => {
    /** @type {(() => void)[]} */
    const later = []
    const { a, list, seen } = dragged({
      reorder: () => {
        later.push(() => {
          list.set(['b', 'c', 'a'])
        })
        return undefined
      },
    })
    point(a, 'pointerdown', 0)
    point(a, 'pointermove', 60)
    point(a, 'pointerup', 60)
    await heard()
    expect(seen.at(-1)).toBe('reorder a->c')
    for (const run of later) {
      run()
    }
    await heard()
    expect(seen.at(-1)).toBe('ended a 60 none')
  })

  test('ends a drop once its reorder is refused, or fails, or after waiting for a change that never comes', async () => {
    const refused = dragged({ reorder: () => Promise.resolve(false) })
    point(refused.a, 'pointerdown', 0)
    point(refused.a, 'pointermove', 60)
    point(refused.a, 'pointerup', 60)
    expect(refused.seen.at(-1)).toBe('reorder a->c')
    await heard()
    await heard()
    expect(refused.seen.at(-1)).toBe('ended a 60 none')
    expect(refused.list.keys()).toEqual(['a', 'b', 'c'])

    const failed = dragged({
      reorder: () => Promise.reject(new Error('refused')),
    })
    point(failed.a, 'pointerdown', 0)
    point(failed.a, 'pointermove', 60)
    point(failed.a, 'pointerup', 60)
    await heard()
    await heard()
    await heard()
    expect(failed.seen.at(-1)).toBe('ended a 60 none')

    const lost = dragged({ reorder: () => undefined, wait: 5 })
    point(lost.a, 'pointerdown', 0)
    point(lost.a, 'pointermove', 60)
    point(lost.a, 'pointerup', 60)
    await heard()
    expect(lost.seen.at(-1)).toBe('reorder a->c')
    await Bun.sleep(10)
    expect(lost.seen.at(-1)).toBe('ended a 60 none')
  })

  test('asks again where a drag would land when the list changes, and cancels it when its key goes', async () => {
    const { a, list, seen } = dragged()
    point(a, 'pointerdown', 0)
    point(a, 'pointermove', 30)
    list.set(['a', 'c'])
    await heard()
    expect(seen.slice(-2)).toEqual(['asked', 'moving a 30 b'])
    list.set(['c'])
    await heard()
    expect(seen.slice(-2)).toEqual(['cancelled a 30 none', 'ended a 30 none'])
    point(a, 'pointerup', 30)
    expect(seen.at(-1)).toBe('ended a 30 none')
  })

  test('asks the gap about the drag, with one record throughout it', () => {
    /** @type {unknown[]} */
    const asked = []
    const element = document.createElement('div')
    const a = document.createElement('div')
    element.append(a)
    element.setPointerCapture = () => undefined
    drag({
      drawn: arrayList(['a']),
      held: arrayList(['a']).hold(undefined, 'none'),
      element,
      gap: (_at, pressed) => {
        asked.push(pressed)
        return undefined
      },
      itemOf: (target) => (target === a ? { key: 'a' } : undefined),
      reorder: () => undefined,
      showing: () => undefined,
    })
    point(a, 'pointerdown', 5)
    point(a, 'pointermove', 15)
    point(a, 'pointermove', 45)
    point(a, 'pointerup', 45)
    point(a, 'pointerdown', 5)
    point(a, 'pointermove', 45)
    expect(asked[0]).toBe(asked[1])
    expect(asked[0]).toEqual({ from: { x: 5, y: 0 }, key: 'a' })
    expect(asked[2]).not.toBe(asked[0])
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
      drawn: arrayList(['a', 'near', 'far']),
      held: arrayList(['a', 'near', 'far']).hold(undefined, 'none'),
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
