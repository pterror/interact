import { describe, expect, test } from 'bun:test'

import { activeDescendant } from './active-descendant.js'
import { arrayList } from './array-list.js'
import { cell } from './cell.js'
import { flowMount } from './flow-mount.js'
import { ids } from './ids.js'
import { render } from './render.js'
import { windowing } from './windowing.js'

/**
 * A key's id
 * @param {string} key - The key
 * @returns {string} Its id
 */
function idOf(key) {
  return `item-${key}`
}

/**
 * What the focused element names, and whether that element is drawn
 * @param {Element} box - The focused element, which holds the items
 * @returns {Readonly<{ named: string | undefined, drawn: boolean }>} What it names
 */
function named(box) {
  const id = box.getAttribute('aria-activedescendant') ?? undefined
  return { drawn: id !== undefined && box.querySelector(`#${id}`) !== null, named: id }
}

/**
 * An item
 * @param {string} key - Its key
 * @returns {Element} The item
 */
function create(key) {
  const element = document.createElement('div')
  element.textContent = key
  return element
}

describe('activeDescendant', () => {
  test('names the active key once drawn, follows it, and stops when its item is removed', () => {
    const box = document.createElement('div')
    const list = arrayList(['a', 'b', 'c'])
    const active = list.hold(undefined, 'none')
    render({
      create,
      drawn: list,
      facets: [ids(idOf), activeDescendant({ active, element: box, idOf })],
      mount: flowMount(box),
    })
    expect(named(box).named).toBeUndefined()
    active.set('b')
    expect(named(box)).toEqual({ drawn: true, named: 'item-b' })
    list.set(['a', 'c'])
    expect(named(box).named).toBeUndefined()
  })

  test('never names an element that is not drawn, while a list on a server answers late', async () => {
    const box = document.createElement('div')
    /** @type {(() => void)[]} */
    const pending = []
    /**
     * Answers when told to
     * @template T
     * @param {() => T} answer - The answer
     * @returns {Promise<T>} It, later
     */
    const later = async (answer) => {
      /** @type {PromiseWithResolvers<T>} */
      const asked = Promise.withResolvers()
      pending.push(() => {
        asked.resolve(answer())
      })
      return asked.promise
    }
    const answerAll = async () => {
      while (pending.length > 0) {
        pending.shift()?.()
        // oxlint-disable-next-line no-await-in-loop -- each answer lands before the next is given
        await Bun.sleep(0)
      }
    }
    /** @type {typeof cell<string | undefined>} */
    const keyCell = cell
    const active = keyCell('k0')
    const ranks = cell({ from: 0, to: 5 })
    const drawn = windowing({
      keep: {
        get() {
          const key = active.get()
          return key === undefined ? [] : [key]
        },
        watch: (listener) => active.watch(listener),
      },
      keysAt: {
        keysAt: async (from, to) =>
          later(() => Array.from({ length: to - from }, (_, index) => `k${String(from + index)}`)),
        watch: () => () => undefined,
      },
      locate: async (key) => later(() => Number(key.slice(1))),
      ranks,
    })
    render({
      create,
      drawn,
      facets: [ids(idOf), activeDescendant({ active, element: box, idOf })],
      mount: flowMount(box),
    })
    /** @type {ReturnType<typeof named>[]} */
    const seen = []
    const look = () => {
      seen.push(named(box))
    }
    look()
    await answerAll()
    look()
    expect(named(box)).toEqual({ drawn: true, named: 'item-k0' })
    active.set('k900')
    look()
    ranks.set({ from: 400, to: 405 })
    look()
    await answerAll()
    look()
    expect(named(box)).toEqual({ drawn: true, named: 'item-k900' })
    expect(seen.filter((each) => each.named !== undefined && !each.drawn)).toEqual([])
    expect(seen.some((each) => each.named === undefined)).toBe(true)
  })
})
