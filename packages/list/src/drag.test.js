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
  const buttons = type === 'pointerup' || type === 'pointercancel' ? 0 : 1
  target.dispatchEvent(
    new PointerEvent(type, { bubbles: true, button: 0, buttons, clientX: x, clientY: 0, pointerId: 1 }),
  )
}

/**
 * Lets every answer given come in, every listener to a change hear it, and what they queued run
 * @returns {Promise<void>} When they have
 */
async function heard() {
  await Bun.sleep(0)
}

/**
 * Moving an item, as drag asks
 * @typedef {(key: string, target: string, after: boolean) => PromiseLike<boolean> | boolean} Reorder
 */

/**
 * Item a in a container, dragged in a list of a, b and c; the pointer over b and c beyond 20 and 40
 * @param {Readonly<{ reorder?: Reorder }>} [options] - Moving an item (left out: at once)
 * @returns {Readonly<{ a: HTMLElement, list: ReturnType<typeof arrayList<string>>, seen: string[], picked: string[],
 *   held: ReturnType<ReturnType<typeof arrayList<string>>['hold']>, stop: () => void }>} What happened
 */
function dragged(options = {}) {
  const element = document.createElement('div')
  const a = document.createElement('div')
  element.append(a)
  document.body.append(element)
  a.setPointerCapture = () => undefined
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
  const { reorder = now } = options
  const held = list.hold(undefined, 'none')
  const stop = drag({
    drawn: list,
    element,
    held,
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
  })
  return { a, held, list, picked, seen, stop }
}

describe('drag', () => {
  test('drags once the pointer moves a few pixels, over the item itself too, and ends once the reorder answers', async () => {
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

  test('starts no drag from a press released elsewhere, or let go unheard, and cancels one whose capture is lost', () => {
    const { a, seen } = dragged()
    point(a, 'pointerdown', 0)
    point(document.body, 'pointerup', 0)
    point(a, 'pointermove', 60)
    a.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, buttons: 0, clientX: 90, pointerId: 1 }))
    expect(seen).toEqual([])
    point(a, 'pointerdown', 0)
    a.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, buttons: 0, clientX: 60, pointerId: 1 }))
    point(a, 'pointermove', 90)
    expect(seen).toEqual([])
    point(a, 'pointerdown', 0)
    point(a, 'pointermove', 30)
    a.parentElement?.dispatchEvent(new PointerEvent('lostpointercapture', { bubbles: true, pointerId: 1 }))
    point(a, 'pointermove', 60)
    point(a, 'pointerup', 60)
    expect(seen).toEqual(['asked', 'moving a 30 b', 'cancelled a 30 none', 'ended a 30 none'])
  })

  test('ends a drop once a late reorder answers that it is applied, whatever changes before', async () => {
    /** @type {PromiseWithResolvers<boolean>} */
    const answer = Promise.withResolvers()
    const { a, held, list, seen } = dragged({ reorder: async () => answer.promise })
    point(a, 'pointerdown', 0)
    point(a, 'pointermove', 60)
    point(a, 'pointerup', 60)
    await heard()
    expect(seen.at(-1)).toBe('reorder a->c')
    list.set(['a', 'b', 'c', 'd'])
    await heard()
    expect(seen.at(-1)).toBe('reorder a->c')
    expect(held.get()).toBe('a')
    list.set(['b', 'c', 'a', 'd'])
    answer.resolve(true)
    await heard()
    expect(seen.at(-1)).toBe('ended a 60 none')
    expect(held.get()).toBeUndefined()
  })

  test('ends a drop, the list as it was, once its reorder is refused or fails', async () => {
    const refused = dragged({ reorder: () => Promise.resolve(false) })
    point(refused.a, 'pointerdown', 0)
    point(refused.a, 'pointermove', 60)
    point(refused.a, 'pointerup', 60)
    expect(refused.seen.at(-1)).toBe('reorder a->c')
    await heard()
    expect(refused.seen.at(-1)).toBe('ended a 60 none')
    expect(refused.list.keys()).toEqual(['a', 'b', 'c'])

    const failed = dragged({ reorder: () => Promise.reject(new Error('refused')) })
    point(failed.a, 'pointerdown', 0)
    point(failed.a, 'pointermove', 60)
    point(failed.a, 'pointerup', 60)
    await heard()
    expect(failed.seen.at(-1)).toBe('ended a 60 none')
    expect(failed.list.keys()).toEqual(['a', 'b', 'c'])

    const thrown = dragged({
      reorder: () => {
        throw new Error('refused')
      },
    })
    point(thrown.a, 'pointerdown', 0)
    point(thrown.a, 'pointermove', 60)
    point(thrown.a, 'pointerup', 60)
    await heard()
    expect(thrown.seen.at(-1)).toBe('ended a 60 none')
  })

  test('takes only the answer for its own drop: one for a drop already ended by the next press ends nothing', async () => {
    /** @type {PromiseWithResolvers<boolean>[]} */
    const answers = []
    const { a, seen } = dragged({
      reorder: async () => {
        /** @type {PromiseWithResolvers<boolean>} */
        const answer = Promise.withResolvers()
        answers.push(answer)
        return answer.promise
      },
    })
    point(a, 'pointerdown', 0)
    point(a, 'pointermove', 60)
    point(a, 'pointerup', 60)
    point(a, 'pointerdown', 0)
    expect(seen.at(-1)).toBe('ended a 60 none')
    point(a, 'pointermove', 30)
    answers[0]?.resolve(true)
    await heard()
    expect(seen.at(-1)).toBe('moving a 30 b')
  })

  test('stopped, cancels and ends a drag under way, and ends a drop waiting for its reorder, letting go of the key', async () => {
    const moving = dragged()
    point(moving.a, 'pointerdown', 0)
    point(moving.a, 'pointermove', 30)
    expect(moving.held.get()).toBe('a')
    moving.stop()
    expect(moving.seen.slice(-2)).toEqual(['cancelled a 30 none', 'ended a 30 none'])
    expect(moving.held.get()).toBeUndefined()
    point(moving.a, 'pointermove', 60)
    expect(moving.seen.at(-1)).toBe('ended a 30 none')

    /** @type {PromiseWithResolvers<boolean>} */
    const answer = Promise.withResolvers()
    const landing = dragged({ reorder: async () => answer.promise })
    point(landing.a, 'pointerdown', 0)
    point(landing.a, 'pointermove', 60)
    point(landing.a, 'pointerup', 60)
    landing.stop()
    expect(landing.seen.slice(-2)).toEqual(['reorder a->c', 'ended a 60 none'])
    expect(landing.held.get()).toBeUndefined()
    answer.resolve(true)
    await heard()
    expect(landing.seen.at(-1)).toBe('ended a 60 none')
  })

  test('asks again where a drag would land when the list changes, and cancels it when its key goes', async () => {
    const { a, list, seen } = dragged()
    point(a, 'pointerdown', 0)
    point(a, 'pointermove', 30)
    list.set(['a', 'c'])
    await heard()
    expect(seen.slice(-2)).toEqual(['asked', 'moving a 30 b'])
    list.set(['c'])
    expect(seen.at(-1)).toBe('cancelled a 30 none')
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
    a.setPointerCapture = () => undefined
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
      reorder: () => true,
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
    a.setPointerCapture = () => undefined
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
        return true
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
