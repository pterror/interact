import { describe, expect, test } from 'bun:test'

import { MemorySource } from '@interact/core'
import { renderToString } from '@interact/dom'

import { listboxOver, press } from './test-helpers.js'

const ONE = 1
const TWO = 2

/**
 * A listbox over a few fruit.
 * @returns {ReturnType<typeof listboxOver<string, import('@interact/core/memory-source').Span, MemorySource<string>>>}
 *   The listbox
 */
function fruit() {
  return listboxOver(new MemorySource(['apple', 'banana', 'cherry'], (item) => item), { id: 'fruit', label: 'Fruit' })
}

/**
 * The positions activated in a listbox from now on.
 * @param {ReturnType<typeof fruit>} made - The listbox
 * @returns {number[]} The positions, as they are activated
 */
function activations({ core, store }) {
  /** @type {number[]} */
  const activated = []
  store.subscribe((transaction) => {
    activated.push(...transaction.effectsOf(core.activated))
  })
  return activated
}

describe('a listbox', () => {
  test('is a named listbox of options, each with an id, and renders every row without windowing', () => {
    const { list, store } = fruit()
    const markup = renderToString(list.render(store.state))
    expect(markup).toContain('role="listbox"')
    expect(markup).toContain('aria-label="Fruit"')
    expect(markup.match(/role="option"/gu)).toHaveLength(3)
    expect(markup).toContain('id="fruit-2"')
  })

  test('activates the active item with Enter', () => {
    const made = fruit()
    const activated = activations(made)
    press(made.store, 'Home')
    press(made.store, 'Enter')
    expect(activated).toEqual([0])
  })

  test('activates an item pressed twice in a row', () => {
    const made = fruit()
    const activated = activations(made)
    made.store.handle(made.list.press.of({ count: ONE, position: TWO, shift: false, toggle: false }))
    made.store.handle(made.list.press.of({ count: TWO, position: TWO, shift: false, toggle: false }))
    expect(activated).toEqual([TWO])
  })

  test('takes no keys when it has no items', () => {
    const { store } = listboxOver(new MemorySource([], String))
    expect(['ArrowDown', 'Enter', ' ', 'a'].map((key) => press(store, key))).toEqual([false, false, false, false])
  })

  test("names the active option as the list's active descendant", () => {
    const { list, store } = fruit()
    press(store, 'Home')
    press(store, 'ArrowDown')
    expect(list.containerAttributesOf(store.state)['aria-activedescendant']).toBe('fruit-1')
  })
})
