import { describe, expect, test } from 'bun:test'

import { arrayList } from './array-list.js'
import { groupMount } from './group-mount.js'
import { render } from './render.js'
import { withHeaders } from './with-headers.js'

/**
 * A key's group: its first letter
 * @param {string} key - The key
 * @returns {string} Its group
 */
function groupOf(key) {
  return key.startsWith('#') ? key.slice(1) : (key[0] ?? '')
}

/**
 * The structure a container shows
 * @param {Element} container - The container
 * @returns {string[][]} Each group's label, then its rows' text
 */
function shown(container) {
  return [...container.children].map((group) => [
    group.getAttribute('aria-labelledby') ?? '',
    ...[...group.children].map((row) => row.textContent),
  ])
}

/**
 * Draws a list grouped by first letter
 * @param {readonly string[]} keys - The keys
 * @returns {Readonly<{ container: Element, list: ReturnType<typeof arrayList<string>> }>} Where, and the list
 */
function grouped(keys) {
  const container = document.createElement('div')
  const list = arrayList(keys)
  render({
    create: (key) => {
      const element = document.createElement('div')
      element.textContent = key
      return element
    },
    drawn: withHeaders({ drawn: list, groupOf, headerOf: (group) => `#${group}` }),
    facets: [],
    mount: groupMount({ container, groupOf, labelIdOf: (group) => `header-${group}` }),
  })
  return { container, list }
}

describe('withHeaders', () => {
  test('puts a header before each group, and gives the same keys while nothing changed', () => {
    const list = arrayList(['a1', 'a2', 'b1'])
    const drawn = withHeaders({ drawn: list, groupOf, headerOf: (group) => `#${group}` })
    expect(drawn.keys()).toEqual(['#a', 'a1', 'a2', '#b', 'b1'])
    expect(drawn.keys()).toBe(drawn.keys())
  })
})

describe('groupMount', () => {
  test('puts each row in its group, labelled, in order', () => {
    const { container } = grouped(['a1', 'a2', 'b1'])
    expect(shown(container)).toEqual([
      ['header-a', '#a', 'a1', 'a2'],
      ['header-b', '#b', 'b1'],
    ])
  })

  test('follows groups appearing, moving and emptying', () => {
    const { container, list } = grouped(['a1', 'b1', 'c1'])
    list.set(['c1', 'c2', 'a1', 'd1'])
    expect(shown(container)).toEqual([
      ['header-c', '#c', 'c1', 'c2'],
      ['header-a', '#a', 'a1'],
      ['header-d', '#d', 'd1'],
    ])
    list.set([])
    expect(container.childElementCount).toBe(0)
  })
})
