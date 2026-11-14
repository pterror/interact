import { describe, expect, test } from 'bun:test'

import { slideMoved } from './slide-moved.js'

/**
 * Drawn keys whose change is told by hand
 * @returns {Readonly<{ drawn: import('./slide-moved.js').Drawn, change: () => void }>} The Drawn, and telling it
 */
function changes() {
  /** @type {Set<() => void>} */
  const listeners = new Set()
  return {
    change: () => {
      for (const listener of listeners) {
        listener()
      }
    },
    drawn: {
      watch(listener) {
        listeners.add(listener)
        return () => {
          listeners.delete(listener)
        }
      },
    },
  }
}

/**
 * An element laid out 100 by 30 where `at` says, in a parent at the page's start, keeping the keyframes it is
 * animated with
 * @param {HTMLElement} parent - The parent
 * @param {() => Readonly<{ x: number, y: number }>} at - Where it is laid out
 * @returns {Readonly<{ element: HTMLElement, slid: unknown[] }>} The element, and its animations' keyframes
 */
function item(parent, at) {
  const element = document.createElement('div')
  parent.append(element)
  element.getBoundingClientRect = () => new globalThis.window.DOMRect(at().x, at().y, 100, 30)
  /** @type {unknown[]} */
  const slid = []
  Object.assign(element, {
    /**
     * @param {unknown} keyframes - Where it slides
     * @returns {EventTarget} The animation
     */
    animate(keyframes) {
      slid.push(keyframes)
      return Object.assign(new EventTarget(), { cancel: () => undefined, playState: 'running' })
    },
  })
  return { element, slid }
}

/**
 * Waits until a change told now has been looked at
 * @returns {Promise<void>} When it has
 */
async function settled() {
  await Promise.resolve()
}

describe('slideMoved', () => {
  test('slides whether or not render watches it, and once however often it does', async () => {
    const parent = document.createElement('div')
    document.body.append(parent)
    let order = ['a', 'b']
    const at = (/** @type {string} */ key) => () => ({ x: order.indexOf(key) * 110, y: 0 })
    const { change, drawn } = changes()
    const facet = slideMoved({ drawn, duration: 100 })
    const a = item(parent, at('a'))
    facet.apply('a', a.element)
    facet.watch(() => undefined)
    facet.watch(() => undefined)()
    order = ['b', 'a']
    change()
    await settled()
    expect(a.slid).toEqual([[{ translate: '-110px 0px' }, { translate: '0px 0px' }]])
  })

  test('items a change moves slide from where they were to where they are', async () => {
    const parent = document.createElement('div')
    document.body.append(parent)
    let order = ['a', 'b', 'c']
    const at = (/** @type {string} */ key) => () => ({ x: order.indexOf(key) * 110, y: 0 })
    const items = new Map(['a', 'b', 'c'].map((key) => [key, item(parent, at(key))]))
    const { change, drawn } = changes()
    const facet = slideMoved({ drawn, duration: 100 })
    for (const [key, { element }] of items) {
      facet.apply(key, element)
    }
    order = ['b', 'a', 'c']
    change()
    await settled()
    expect(items.get('a')?.slid).toEqual([[{ translate: '-110px 0px' }, { translate: '0px 0px' }]])
    expect(items.get('b')?.slid).toEqual([[{ translate: '110px 0px' }, { translate: '0px 0px' }]])
    expect(items.get('c')?.slid).toEqual([])
  })

  test('an item put in between slides nothing itself, and those after it slide on', async () => {
    const parent = document.createElement('div')
    document.body.append(parent)
    let order = ['a', 'c']
    const at = (/** @type {string} */ key) => () => ({ x: 0, y: order.indexOf(key) * 40 })
    const { change, drawn } = changes()
    const facet = slideMoved({ drawn, duration: 100 })
    const a = item(parent, at('a'))
    const c = item(parent, at('c'))
    facet.apply('a', a.element)
    facet.apply('c', c.element)
    order = ['a', 'b', 'c']
    const b = item(parent, at('b'))
    facet.apply('b', b.element)
    change()
    await settled()
    expect(b.slid).toEqual([])
    expect(a.slid).toEqual([])
    expect(c.slid).toEqual([[{ translate: '0px -40px' }, { translate: '0px 0px' }]])
  })

  test('the items it is told to leave, a duration of 0, and a stopped facet slide nothing', async () => {
    const parent = document.createElement('div')
    document.body.append(parent)
    let order = ['a', 'b', 'c']
    const at = (/** @type {string} */ key) => () => ({ x: order.indexOf(key) * 110, y: 0 })
    const { change, drawn } = changes()
    const left = new Set(['a', 'b'])
    const facet = slideMoved({ drawn, duration: 100, leave: { has: (/** @type {string} */ key) => left.has(key) } })
    const a = item(parent, at('a'))
    const b = item(parent, at('b'))
    const c = item(parent, at('c'))
    facet.apply('a', a.element)
    facet.apply('b', b.element)
    facet.apply('c', c.element)
    order = ['c', 'b', 'a']
    change()
    await settled()
    expect(a.slid).toEqual([])
    expect(b.slid).toEqual([])
    expect(c.slid).toEqual([[{ translate: '220px 0px' }, { translate: '0px 0px' }]])

    facet.stop()
    order = ['a', 'b', 'c']
    change()
    await settled()
    expect(c.slid.length).toBe(1)

    const still = slideMoved({ drawn, duration: 0 })
    const d = item(parent, () => ({ x: order.indexOf('c') * 110, y: 0 }))
    still.apply('d', d.element)
    order = ['c', 'a', 'b']
    change()
    await settled()
    expect(d.slid).toEqual([])
  })

  test('a dropped item is no longer slid', async () => {
    const parent = document.createElement('div')
    document.body.append(parent)
    let x = 0
    const { change, drawn } = changes()
    const facet = slideMoved({ drawn, duration: 100 })
    const a = item(parent, () => ({ x, y: 0 }))
    facet.apply('a', a.element)
    facet.drop('a', a.element)
    x = 200
    change()
    await settled()
    expect(a.slid).toEqual([])
  })
})
