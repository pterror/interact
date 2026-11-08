import { describe, expect, test } from 'bun:test'

import { activeDescendant } from './active-descendant.js'
import { byEntry } from './by-entry.js'
import { cell } from './cell.js'
import { content } from './content.js'
import { flowMount } from './flow-mount.js'
import { ids } from './ids.js'
import { items } from './items.js'
import { keepInPlace } from './keep-in-place.js'
import { measuredRows } from './measured-rows.js'
import { nest } from './nest.js'
import { render } from './render.js'
import { treeCache } from './tree-cache.js'

/**
 * A node of a test tree
 * @typedef {Readonly<{ key: string, children?: readonly TestNode[] }>} TestNode
 */

/**
 * A node of a test tree that shows a label
 * @typedef {Readonly<{ key: string, label: string, children?: readonly LabelNode[] }>} LabelNode
 */

describe('measuredRows', () => {
  test('takes rows to be the estimate until measured, and places the rest by what was measured', () => {
    const layout = measuredRows(10)
    /** @type {number[][]} */
    const shifts = []
    layout.watchShifts((top, by) => {
      shifts.push([top, by])
    })
    expect(layout.place(5)).toEqual({ x: 0, y: 50 })
    layout.measure(2, 40)
    layout.measure(2, 40)
    expect(layout.place(5)).toEqual({ x: 0, y: 80 })
    expect(layout.place(2)).toEqual({ x: 0, y: 20 })
    expect(layout.extent(1_000_000_000)).toEqual({ height: 10_000_000_030 })
    expect(layout.ranksIn(25, 65, 100)).toEqual({ from: 2, to: 4 })
    expect(layout.ranksIn(0, 5, 100)).toEqual({ from: 0, to: 1 })
    expect(shifts).toEqual([[20, 30]])
  })
})

describe('keepInPlace', () => {
  test('scrolls by a change of height above what it holds still: the anchor in view, else the top of the view', () => {
    const layout = measuredRows(10)
    /** @type {number[]} */
    const scrolled = []
    /** @type {number | undefined} */
    let anchor = undefined
    let start = 100
    keepInPlace({
      anchor: () => anchor,
      scrollBy: (pixels) => {
        scrolled.push(pixels)
        start += pixels
      },
      shifts: layout,
      visible: { get: () => ({ end: start + 200, start }), watch: () => () => undefined },
    })
    layout.measure(3, 25)
    layout.measure(30, 5)
    anchor = 265
    layout.measure(20, 12)
    anchor = 900
    layout.measure(21, 12)
    expect(scrolled).toEqual([15, 2])
  })

  test('aims at where the view was plus the change, though the browser moved the view first', () => {
    const layout = measuredRows(10)
    let start = 100
    keepInPlace({
      anchor: () => undefined,
      scrollBy: (pixels) => {
        start += pixels
      },
      shifts: layout,
      visible: { get: () => ({ end: start + 200, start }), watch: () => () => undefined },
    })
    layout.watch(() => {
      start -= 4
    })
    layout.measure(3, 4)
    expect(start).toBe(94)
  })
})

describe('treeCache', () => {
  /** @type {readonly TestNode[]} */
  const tree0 = [
    { children: [{ key: 'a/x' }, { children: [{ key: 'a/y/z' }], key: 'a/y' }], key: 'a' },
    { key: 'b' },
    { children: [{ key: 'c/w' }], key: 'c' },
  ]

  test('gives top-level keys at ranks, each node, and each node’s children; fetches a far node when located', async () => {
    /** @type {string[]} */
    const asked = []
    const cache = treeCache({
      changes: { watch: () => () => undefined },
      fetch: (from, to) => {
        asked.push(`${String(from)}-${String(to)}`)
        return Promise.resolve(tree0.slice(from, to))
      },
      locate: (key) => Promise.resolve(tree0.findIndex((node) => node.key === key)),
    })
    expect(await cache.keysAt(0, 2)).toEqual(['a', 'b'])
    expect(cache.children('a').keys()).toEqual(['a/x', 'a/y'])
    expect(cache.children('a/y').keys()).toEqual(['a/y/z'])
    expect(cache.node('c')).toBeUndefined()
    expect(await cache.locate('c')).toBe(2)
    expect(cache.children('c').keys()).toEqual(['c/w'])
    expect(asked).toEqual(['0-2', '2-3'])
  })

  test('tells a node’s list when its children change, and windowing when the tree does', async () => {
    let tree = tree0
    /** @type {Set<() => void>} */
    const changed = new Set()
    const cache = treeCache({
      changes: {
        watch(listener) {
          changed.add(listener)
          return () => undefined
        },
      },
      fetch: (from, to) => Promise.resolve(tree.slice(from, to)),
      locate: () => Promise.resolve(undefined),
    })
    await cache.keysAt(0, 3)
    let heard = 0
    cache.children('c').watch(() => {
      heard += 1
    })
    let asked = 0
    cache.watch(() => {
      asked += 1
    })
    tree = [...tree0.slice(0, 2), { children: [{ key: 'c/w' }, { key: 'c/v' }], key: 'c' }]
    for (const listener of changed) {
      listener()
    }
    await cache.keysAt(0, 3)
    expect([asked, heard]).toEqual([1, 1])
    expect(cache.children('c').keys()).toEqual(['c/w', 'c/v'])
  })
})

describe('treeCache and content', () => {
  test('shows an item again when its node says something new about itself under the same key', async () => {
    /** @type {readonly LabelNode[]} */
    let tree = [{ children: [{ key: 'a/+', label: '+2 more' }], key: 'a', label: 'A' }]
    /** @type {Set<() => void>} */
    const changed = new Set()
    const cache = treeCache({
      changes: {
        watch(listener) {
          changed.add(listener)
          return () => undefined
        },
      },
      fetch: (from, to) => Promise.resolve(tree.slice(from, to)),
      locate: () => Promise.resolve(undefined),
    })
    await cache.keysAt(0, 1)
    const box = document.createElement('div')
    render({
      create: () => document.createElement('div'),
      drawn: cache.children('a'),
      facets: [
        content({
          changes: { watch: cache.watchNodes },
          show: (key, element) => {
            element.textContent = cache.node(key)?.label ?? ''
          },
        }),
      ],
      mount: flowMount(box),
    })
    const tile = box.firstElementChild
    expect(tile?.textContent).toBe('+2 more')
    tree = [{ children: [{ key: 'a/+', label: '+3 more' }], key: 'a', label: 'A' }]
    for (const listener of changed) {
      listener()
    }
    await cache.keysAt(0, 1)
    expect(box.firstElementChild).toBe(tile)
    expect(tile?.textContent).toBe('+3 more')
  })
})

describe('nest, items and activeDescendant across nested lists', () => {
  test('builds a list inside an item, finds the innermost item, and names the active key in whichever list draws it', () => {
    const box = document.createElement('div')
    /** @type {typeof cell<string | undefined>} */
    const keyCell = cell
    const active = keyCell(undefined)
    /** @type {ReturnType<typeof items<string>>} */
    const all = items()
    const named = activeDescendant({ active, element: box, idOf: (key) => `i-${key.replaceAll('/', '-')}` })
    /** @type {Record<string, readonly string[]>} */
    const children = { a: ['a/x', 'a/y'], b: [] }
    /** @type {string[]} */
    const stopped = []
    /** @type {ReturnType<typeof nest<string>>} */
    const nested = nest((key, element) => {
      const inner = children[key]
      if (inner === undefined || inner.length === 0) {
        return undefined
      }
      const rendered = render({
        create: (child) => {
          const made = document.createElement('div')
          made.textContent = child
          return made
        },
        drawn: { keys: () => inner, watch: () => () => undefined },
        facets: [ids((/** @type {string} */ child) => `i-${child.replaceAll('/', '-')}`), named, all],
        mount: flowMount(element),
      })
      return () => {
        stopped.push(key)
        rendered.stop()
      }
    })
    /** @type {readonly string[]} */
    const tops = ['a', 'b']
    const top = cell(tops)
    render({
      create: (key) => {
        const made = document.createElement('div')
        made.dataset['key'] = key
        return made
      },
      drawn: { keys: top.get, watch: (listener) => top.watch(listener) },
      facets: [ids((key) => `i-${key}`), named, all, nested],
      mount: flowMount(box),
    })
    active.set('a/y')
    expect(box.getAttribute('aria-activedescendant')).toBe('i-a-y')
    active.set('b')
    expect(box.getAttribute('aria-activedescendant')).toBe('i-b')
    active.set('a/x')
    expect(box.getAttribute('aria-activedescendant')).toBe('i-a-x')
    const inner = box.querySelector('#i-a-x')
    expect(all.itemOf(inner)?.key).toBe('a/x')
    expect(all.itemOf(box.querySelector('#i-a'))?.key).toBe('a')
    top.set(['b'])
    expect(stopped).toEqual(['a'])
  })
})

describe('byEntry', () => {
  test('holds for every occurrence of a held entry', () => {
    const selected = cell('shared')
    const occurrences = byEntry({ entryOf: (/** @type {string} */ key) => key.split('/').at(-1), test: selected })
    expect([occurrences.has('a/shared'), occurrences.has('b/shared'), occurrences.has('a/other')]).toEqual([
      true,
      true,
      false,
    ])
  })
})
