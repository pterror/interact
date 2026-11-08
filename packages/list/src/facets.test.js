import { describe, expect, mock, test } from 'bun:test'

import { activeDescendant } from './active-descendant.js'
import { arrayList } from './array-list.js'
import { ids } from './ids.js'
import { mark } from './mark.js'
import { pick } from './pick.js'
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

describe('activeDescendant', () => {
  test('names the active key, and removes the attribute without one', () => {
    const list = arrayList(['a', 'b'])
    const active = list.hold(undefined, 'next')
    const element = document.createElement('div')
    activeDescendant({ active, element, idOf: (key) => `option-${key}` })
    expect(element.hasAttribute('aria-activedescendant')).toBe(false)
    active.set('b')
    expect(element.getAttribute('aria-activedescendant')).toBe('option-b')
    list.set(['a'])
    expect(element.getAttribute('aria-activedescendant')).toBe('option-a')
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
