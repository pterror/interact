import { describe, expect, test } from 'bun:test'

import { arrayList } from './array-list.js'
import { flowMount } from './flow-mount.js'
import { render } from './render.js'

/**
 * An element for a key
 * @param {string} key - The key
 * @returns {Element} An item showing it
 */
function create(key) {
  const element = document.createElement('div')
  element.textContent = key
  return element
}

/**
 * The keys a container shows, in order
 * @param {Element} container - The container
 * @returns {string[]} Its children's text
 */
function shown(container) {
  return [...container.children].map((child) => child.textContent)
}

describe('render', () => {
  test('draws each key in order, and follows the keys changing without remaking what stays', () => {
    const container = document.createElement('div')
    const list = arrayList(['a', 'b', 'c'])
    render({ create, drawn: list, facets: [], mount: flowMount(container) })
    expect(shown(container)).toEqual(['a', 'b', 'c'])
    const b = container.children[1]
    list.set(['c', 'b', 'd'])
    expect(shown(container)).toEqual(['c', 'b', 'd'])
    expect(container.children[1]).toBe(b)
  })

  test('applies every facet to an element once it is mounted, and again for the keys a facet reports', () => {
    const container = document.createElement('div')
    const list = arrayList(['a', 'b'])
    /** @type {((keys?: readonly string[]) => void)[]} */
    const listeners = []
    /** @type {string[]} */
    const applied = []
    render({
      create,
      drawn: list,
      facets: [
        {
          apply(key, element) {
            applied.push(`${key}:${String(element.isConnected || element.parentNode === container)}`)
          },
          watch(listener) {
            listeners.push(listener)
            return () => undefined
          },
        },
      ],
      mount: flowMount(container),
    })
    expect(applied).toEqual(['b:true', 'a:true'])
    for (const listener of listeners) {
      listener(['a'])
      listener()
    }
    expect(applied).toEqual(['b:true', 'a:true', 'a:true', 'b:true', 'a:true'])
  })

  test('finds the item an event target is in', () => {
    const container = document.createElement('div')
    const rendered = render({
      create: (key) => {
        const element = create(key)
        element.append(document.createElement('span'))
        return element
      },
      drawn: arrayList(['a']),
      facets: [],
      mount: flowMount(container),
    })
    const item = container.children[0]
    const inside = item?.querySelector('span') ?? container
    expect(rendered.itemOf(inside)?.key).toBe('a')
    expect(rendered.itemOf(container)).toBeUndefined()
    expect(rendered.itemOf(new EventTarget())).toBeUndefined()
  })

  test('stops following the keys', () => {
    const container = document.createElement('div')
    const list = arrayList(['a'])
    const rendered = render({ create, drawn: list, facets: [], mount: flowMount(container) })
    rendered.stop()
    list.set(['b'])
    expect(shown(container)).toEqual(['a'])
  })

  test('tells every facet, when it stops, that each element it drew is no longer drawn', () => {
    const container = document.createElement('div')
    /** @type {string[]} */
    const dropped = []
    const rendered = render({
      create,
      drawn: arrayList(['a', 'b']),
      facets: [
        {
          apply: () => undefined,
          drop: (key) => {
            dropped.push(key)
          },
          watch: () => () => undefined,
        },
      ],
      mount: flowMount(container),
    })
    rendered.stop()
    expect(dropped.toSorted()).toEqual(['a', 'b'])
  })

  test('tells what made an element, once, that it is done with it: after the facets, when taken out or stopping', () => {
    const container = document.createElement('div')
    const list = arrayList(['a', 'b'])
    /** @type {string[]} */
    const heard = []
    const rendered = render({
      create,
      drawn: list,
      drop: (key, element) => {
        heard.push(`made ${key}:${String(element.isConnected || element.parentNode === container)}`)
      },
      facets: [
        {
          apply: () => undefined,
          drop: (key) => {
            heard.push(`facet ${key}`)
          },
          watch: () => () => undefined,
        },
      ],
      mount: flowMount(container),
    })
    list.set(['b'])
    expect(heard).toEqual(['facet a', 'made a:false'])
    rendered.stop()
    expect(heard).toEqual(['facet a', 'made a:false', 'facet b', 'made b:true'])
  })
})
