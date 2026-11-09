import { describe, expect, test } from 'bun:test'

import { arrayList, computedKeysAt, computedLocate, flowMount, mark, render, windowing } from '@pterror/interact-list'
import {
  createComponent,
  createContext,
  createRenderEffect,
  createRoot,
  createSignal,
  onCleanup,
  onMount,
  useContext,
} from 'solid-js'

import { componentItems } from './component-items.js'
import { fromTest } from './from-test.js'
import { toDrawn } from './to-drawn.js'
import { toWatched } from './to-watched.js'

const Theme = createContext('none')

/**
 * The key at a rank of a list worked out from ranks
 * @param {number} rank - The rank
 * @returns {string} Its key
 */
function keyAt(rank) {
  return `k${String(rank)}`
}

/**
 * A key's rank in a list worked out from ranks
 * @param {string} key - The key
 * @returns {number} Its rank
 */
function rankOf(key) {
  return Number(key.slice(1))
}

/**
 * The text each child of a container shows
 * @param {Element} container - The container
 * @returns {string[]} Each child's text
 */
function shown(container) {
  return [...container.children].map((child) => child.textContent)
}

describe('componentItems', () => {
  test("draws each key with the component, in the owner's context, disposing an item when render is done with it", () => {
    const list = arrayList(['a', 'b'])
    const container = document.createElement('div')
    /** @type {string[]} */
    const disposed = []
    const dispose = createRoot((disposeRoot) => {
      createComponent(Theme.Provider, {
        get children() {
          const items = componentItems((/** @type {Readonly<{ key: string }>} */ props) => {
            const element = document.createElement('div')
            element.textContent = `${props.key} ${useContext(Theme)}`
            onCleanup(() => {
              disposed.push(props.key)
            })
            return element
          })
          const rendered = render({ ...items, drawn: list, facets: [], mount: flowMount(container) })
          onCleanup(rendered.stop)
          return undefined
        },
        value: 'dark',
      })
      return disposeRoot
    })
    expect(shown(container)).toEqual(['a dark', 'b dark'])
    list.set(['b', 'c'])
    expect(shown(container)).toEqual(['b dark', 'c dark'])
    expect(disposed).toEqual(['a'])
    dispose()
    expect(disposed.toSorted()).toEqual(['a', 'b', 'c'])
  })

  test('keeps an item drawn by a list Solid holds when the list changes, as its items belong to the owner', () => {
    const [keys, setKeys] = createSignal(['a'])
    const container = document.createElement('div')
    let made = 0
    let disposed = 0
    createRoot(() => {
      const items = componentItems((/** @type {Readonly<{ key: string }>} */ props) => {
        made += 1
        onCleanup(() => {
          disposed += 1
        })
        const element = document.createElement('div')
        element.textContent = props.key
        return element
      })
      render({ ...items, drawn: toDrawn(keys), facets: [], mount: flowMount(container) })
    })
    setKeys(['a', 'b'])
    setKeys(['a', 'b', 'c'])
    expect(shown(container)).toEqual(['a', 'b', 'c'])
    expect([made, disposed]).toEqual([3, 0])
  })

  test('disposes what the owner still holds when the owner goes, even if render was not stopped', () => {
    let disposed = 0
    const dispose = createRoot((disposeRoot) => {
      const items = componentItems(() => {
        onCleanup(() => {
          disposed += 1
        })
        return document.createElement('div')
      })
      render({ ...items, drawn: arrayList(['a', 'b']), facets: [], mount: flowMount(document.createElement('div')) })
      return disposeRoot
    })
    dispose()
    expect(disposed).toBe(2)
  })

  test('refuses a component that gives anything but one element', () => {
    createRoot(() => {
      const items = componentItems(() => 'text')
      expect(() => items.create('a')).toThrow('An item component must give one element')
    })
  })

  test('runs effects once the element is in place inside a Solid update, and at once outside one', () => {
    const container = document.createElement('div')
    document.body.append(container)
    /** @type {[string, boolean][]} */
    const mounted = []
    const [keys, setKeys] = createSignal(['a'])
    const list = arrayList(['x'])
    createRoot(() => {
      const items = componentItems((/** @type {Readonly<{ key: string }>} */ props) => {
        const element = document.createElement('div')
        onMount(() => {
          mounted.push([props.key, element.isConnected])
        })
        return element
      })
      render({ ...items, drawn: toDrawn(keys), facets: [], mount: flowMount(container) })
      render({ ...items, drawn: list, facets: [], mount: flowMount(container) })
    })
    mounted.length = 0
    setKeys(['a', 'b'])
    list.set(['x', 'y'])
    expect(mounted).toEqual([
      ['b', true],
      ['y', false],
    ])
    container.remove()
  })

  test('nests: a list drawn inside an item sees the context the item provides, and goes with the item', () => {
    const outer = arrayList(['r'])
    const container = document.createElement('div')
    /** @type {string[]} */
    const disposed = []
    /**
     * A member of a region
     * @param {Readonly<{ key: string }>} props - Its key
     * @returns {Element} Its element
     */
    const Member = (props) => {
      const element = document.createElement('span')
      element.textContent = `${props.key} in ${useContext(Theme)}`
      onCleanup(() => {
        disposed.push(props.key)
      })
      return element
    }
    /**
     * A region, with its members drawn inside it
     * @param {Readonly<{ key: string }>} props - Its key
     * @returns {Element} Its element
     */
    const Region = (props) => {
      const element = document.createElement('div')
      createComponent(Theme.Provider, {
        get children() {
          const items = componentItems(Member)
          const rendered = render({
            ...items,
            drawn: arrayList([`${props.key}1`, `${props.key}2`]),
            facets: [],
            mount: flowMount(element),
          })
          onCleanup(rendered.stop)
          return undefined
        },
        value: props.key,
      })
      return element
    }
    createRoot(() => {
      const items = componentItems(Region)
      render({ ...items, drawn: outer, facets: [], mount: flowMount(container) })
    })
    expect(shown(container)).toEqual(['r1 in rr2 in r'])
    outer.set([])
    expect(disposed.toSorted()).toEqual(['r1', 'r2'])
  })
})

describe('a billion keys drawn by Solid components', () => {
  test('makes a component only for each key drawn, and reruns only the items whose state changed', async () => {
    const count = 1_000_000_000
    const [ranks, setRanks] = createSignal({ from: 0, to: 20 })
    /** @type {readonly string[]} */
    const none = []
    const [keep] = createSignal(none)
    const list = arrayList(['k0'])
    const active = list.hold('k0', 'none')
    const drawn = windowing({
      keep: toWatched(keep),
      keysAt: computedKeysAt({ count, keyAt }),
      locate: computedLocate(rankOf),
      ranks: toWatched(ranks),
    })
    const container = document.createElement('div')
    let made = 0
    let reran = 0
    createRoot(() => {
      const isActive = fromTest(active)
      const items = componentItems((/** @type {Readonly<{ key: string }>} */ props) => {
        made += 1
        const element = document.createElement('div')
        createRenderEffect(() => {
          reran += 1
          element.className = isActive(props.key) ? 'active' : ''
        })
        return element
      })
      render({
        ...items,
        drawn,
        facets: [mark({ attribute: 'data-active', on: '', test: active })],
        mount: flowMount(container),
      })
    })
    await Bun.sleep(0)
    expect(container.children.length).toBe(40)
    expect([made, reran]).toEqual([40, 40])
    setRanks({ from: 1000, to: 1020 })
    await Bun.sleep(0)
    expect(container.children.length).toBe(60)
    expect(made).toBe(100)
    reran = 0
    list.set(['k0', 'k1000'])
    active.set('k1000')
    expect(reran).toBe(1)
    expect(container.querySelector('.active[data-active]')).not.toBeNull()
  })
})
