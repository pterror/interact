import { describe, expect, mock, test } from 'bun:test'

import { arrayList } from './array-list.js'
import { ids } from './ids.js'
import { mark } from './mark.js'
import { pick } from './pick.js'
import { revealPart } from './reveal-part.js'
import { reveal } from './reveal.js'

describe('mark', () => {
  test('sets one value while its test holds and another, or none, while it does not', () => {
    const list = arrayList(['a', 'b'])
    const selected = list.hold('a', 'none')
    const element = document.createElement('div')
    const both = mark({ attribute: 'aria-selected', off: 'false', on: 'true', test: selected })
    const one = mark({ attribute: 'data-active', on: '', test: selected })
    both.apply('a', element)
    one.apply('a', element)
    expect([
      element.getAttribute('aria-selected'),
      element instanceof HTMLElement && element.dataset['active'],
    ]).toEqual(['true', ''])
    both.apply('b', element)
    one.apply('b', element)
    expect([
      element.getAttribute('aria-selected'),
      element instanceof HTMLElement && 'active' in element.dataset,
    ]).toEqual(['false', false])
  })
})

describe('ids', () => {
  test("gives an element its key's id", () => {
    const element = document.createElement('div')
    ids((key) => `option-${key}`).apply('a', element)
    expect(element.id).toBe('option-a')
  })
})

describe('pick', () => {
  test('hands on the key of the item clicked, and nothing for a click elsewhere', () => {
    const element = document.createElement('div')
    const item = document.createElement('div')
    element.append(item)
    /** @type {string[]} */
    const picked = []
    const stop = pick({
      element,
      itemOf: (target) => (target === item ? { key: 'a' } : undefined),
      to: (key) => {
        picked.push(key)
      },
    })
    item.click()
    element.click()
    stop()
    item.click()
    expect(picked).toEqual(['a'])
  })
})

describe('reveal', () => {
  test('scrolls the element of a key that changed, once, after the pass that applies it', async () => {
    const list = arrayList(['a', 'b'])
    const active = list.hold(undefined, 'next')
    const facet = reveal(active)
    /** @type {(readonly string[] | undefined)[]} */
    const reported = []
    facet.watch((keys) => {
      reported.push(keys)
    })
    const element = document.createElement('div')
    document.body.append(element)
    const scrolled = mock(() => undefined)
    element.scrollIntoView = scrolled
    active.set('b')
    expect(reported).toEqual([['b']])
    facet.apply('a', element)
    facet.apply('b', element)
    expect(scrolled).not.toHaveBeenCalled()
    await Promise.resolve()
    facet.apply('b', element)
    await Promise.resolve()
    expect(scrolled).toHaveBeenCalledTimes(1)
    element.remove()
  })
})

describe('revealPart', () => {
  test("scrolls the part of a changed key's element that stands for it, or the element when it has none", async () => {
    const list = arrayList(['a', 'b'])
    const active = list.hold(undefined, 'next')
    const facet = revealPart({ part: (_key, element) => element.querySelector('.head') ?? undefined, target: active })
    facet.watch(() => undefined)
    const region = document.createElement('div')
    const head = document.createElement('div')
    head.className = 'head'
    region.append(head)
    const plain = document.createElement('div')
    document.body.append(region, plain)
    const headScrolled = mock(() => undefined)
    const regionScrolled = mock(() => undefined)
    const plainScrolled = mock(() => undefined)
    head.scrollIntoView = headScrolled
    region.scrollIntoView = regionScrolled
    plain.scrollIntoView = plainScrolled
    active.set('a')
    facet.apply('a', region)
    await Promise.resolve()
    expect(headScrolled).toHaveBeenCalledTimes(1)
    expect(regionScrolled).not.toHaveBeenCalled()
    active.set('b')
    facet.apply('b', plain)
    await Promise.resolve()
    expect(plainScrolled).toHaveBeenCalledTimes(1)
    region.remove()
    plain.remove()
  })
})
