import { describe, expect, test } from 'bun:test'

import { activeDescendant } from './active-descendant.js'
import { byEntry } from './by-entry.js'
import { cell } from './cell.js'
import { content } from './content.js'
import { flowMount } from './flow-mount.js'
import { ids } from './ids.js'
import { items } from './items.js'
import { keepInPlace } from './keep-in-place.js'
import { measure } from './measure.js'
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
    /** @type {ReturnType<typeof measuredRows<string>>} */
    const layout = measuredRows(10)
    expect(layout.place(5)).toEqual({ x: 0, y: 50 })
    layout.measure('c', 2, 40)
    layout.measure('c', 2, 40)
    expect(layout.place(5)).toEqual({ x: 0, y: 80 })
    expect(layout.place(2)).toEqual({ x: 0, y: 20 })
    expect(layout.extent(1_000_000_000)).toEqual({ height: 10_000_000_030 })
    expect(layout.ranksIn(25, 65, 100)).toEqual({ from: 2, to: 4 })
    expect(layout.ranksIn(0, 5, 100)).toEqual({ from: 0, to: 1 })
  })

  test('keeps a height with its key, so it moves with its item when the list changes', () => {
    /** @type {ReturnType<typeof measuredRows<string>>} */
    const layout = measuredRows(10)
    layout.measure('b', 1, 40)
    layout.measure('d', 3, 20)
    expect(layout.place(4)).toEqual({ x: 0, y: 80 })
    layout.measure('b', 2, 40)
    layout.measure('d', 4, 20)
    expect([layout.place(2), layout.place(3), layout.place(5)]).toEqual([
      { x: 0, y: 20 },
      { x: 0, y: 60 },
      { x: 0, y: 90 },
    ])
    layout.measure('z', 2, 15)
    expect(layout.place(3)).toEqual({ x: 0, y: 35 })
  })
})

describe('measure', () => {
  test('hands on each element’s key, rank and height again when ranks change', async () => {
    /** @type {Map<string, number>} */
    const ranks = new Map([['a', 0]])
    /** @type {Set<() => void>} */
    const moved = new Set()
    /** @type {string[]} */
    const heard = []
    const facet = measure({
      measure: (key, rank) => {
        heard.push(`${key}@${String(rank)}`)
      },
      rank: {
        rank: (/** @type {string} */ key) => ranks.get(key),
        watchRanks(listener) {
          moved.add(listener)
          return () => undefined
        },
      },
    })
    const element = document.createElement('div')
    document.body.append(element)
    facet.apply('a', element)
    facet.watch()
    ranks.set('a', 3)
    for (const listener of moved) {
      listener()
    }
    await Bun.sleep(50)
    element.remove()
    expect(heard).toEqual(['a@3'])
  })
})

/**
 * Rows of ten pixels over keys a..z, a view from pixel `start` 50 high, and the keys drawn with their ranks
 * @returns {Readonly<{ ranks: Map<string, number>, view: { start: number }, held: (string | undefined)[],
 *   layout: ReturnType<typeof measuredRows<string>>, moved: () => void, userScroll: (to: number) => void }>} The
 *   setup
 */
function setup() {
  /** @type {Map<string, number>} */
  const ranks = new Map('abcdefghij'.split('').map((key, rank) => [key, rank]))
  const view = { start: 30 }
  /** @type {Set<() => void>} */
  const rankListeners = new Set()
  /** @type {Set<() => void>} */
  const scrollListeners = new Set()
  /** @type {(string | undefined)[]} */
  const held = []
  /** @type {ReturnType<typeof measuredRows<string>>} */
  const layout = measuredRows(10)
  keepInPlace({
    drawn: {
      keys: () => [...ranks.keys()],
      rank: (key) => ranks.get(key),
      watchRanks(listener) {
        rankListeners.add(listener)
        return () => undefined
      },
    },
    hold: (key) => {
      held.push(key)
    },
    layout,
    prefer: () => undefined,
    scrollBy: (pixels) => {
      view.start += pixels
    },
    visible: {
      get: () => ({ end: view.start + 50, start: view.start }),
      watch(listener) {
        scrollListeners.add(listener)
        return () => undefined
      },
    },
  })
  return {
    held,
    layout,
    moved() {
      for (const listener of rankListeners) {
        listener()
      }
    },
    ranks,
    userScroll(to) {
      view.start = to
      for (const listener of scrollListeners) {
        listener()
      }
    },
    view,
  }
}

describe('keepInPlace', () => {
  test('holds the first item in view by key when items are added or removed above it', async () => {
    const { held, moved, ranks, view } = setup()
    expect(held).toEqual(['d'])
    for (const [key, rank] of ranks) {
      ranks.set(key, rank + 4)
    }
    moved()
    await Promise.resolve()
    expect(view.start).toBe(70)
    for (const [key, rank] of ranks) {
      ranks.set(key, rank - 6)
    }
    moved()
    await Promise.resolve()
    expect(view.start).toBe(10)
  })

  test('holds it when rows above it are measured, and picks again when the view is scrolled', async () => {
    const { held, layout, userScroll, view } = setup()
    layout.measure('a', 0, 25)
    await Promise.resolve()
    expect(view.start).toBe(45)
    userScroll(60)
    expect(held.at(-1)).toBe('f')
    layout.measure('j', 9, 40)
    await Promise.resolve()
    expect(view.start).toBe(60)
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
