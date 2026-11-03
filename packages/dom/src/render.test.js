/** @import { TemplateResult } from './template.js' */

import { describe, expect, test } from 'bun:test'

import { hasServerMarkup, hydrate, render } from './render.js'
import { html, repeat } from './template.js'
import { find, serverMarkup } from './test-helpers.js'

/** @typedef {Readonly<{ id: string, label: string }>} Row */

const APPLE = { id: 'a', label: 'Apple' }
const BANANA = { id: 'b', label: 'Banana' }
const CHERRY = { id: 'c', label: 'Cherry' }

/**
 * A list view, as a component's would be.
 * @param {readonly Row[]} rows - The rows
 * @param {string} title - The list's title
 * @param {(event: Event) => void} onClick - Called on a click
 * @returns {TemplateResult} The view
 */
function list(rows, title, onClick) {
  return html`<ul title=${title} @click=${onClick}>
    ${repeat(
      rows,
      (row) => row.id,
      (row) => html`<li data-id=${row.id}>${row.label}</li>`,
    )}
  </ul>`
}

/**
 * Nothing to do on an event.
 * @returns {void}
 */
function ignore() {
  return undefined
}

/**
 * The rendered rows.
 * @param {Element} container - Where the list is
 * @returns {HTMLElement[]} The `<li>` elements, in order
 */
function rowsIn(container) {
  return [...container.querySelectorAll('li')]
}

describe('render', () => {
  test('renders, then updates only what changed, keeping nodes', () => {
    const container = document.createElement('div')
    render(list([APPLE, BANANA], 'Fruit', ignore), container)
    const before = rowsIn(container)
    render(list([{ ...APPLE, label: 'Apricot' }, BANANA], 'Fruit', ignore), container)
    expect(rowsIn(container)).toEqual(before)
    expect(rowsIn(container).map((row) => row.textContent)).toEqual(['Apricot', 'Banana'])
  })

  test('moves items by key, keeping each item that stays', () => {
    const container = document.createElement('div')
    render(list([APPLE, BANANA, CHERRY], 'Fruit', ignore), container)
    const [apple, banana, cherry] = rowsIn(container)
    render(list([CHERRY, APPLE], 'Fruit', ignore), container)
    expect(rowsIn(container)).toEqual([cherry, apple].filter((row) => row !== undefined))
    expect(banana?.isConnected).toBe(false)
  })
})

describe('render, hole by hole', () => {
  test('removes an attribute set to undefined, and calls the handler it holds now', () => {
    const container = document.createElement('div')
    /** @type {string[]} */
    const heard = []
    render(html`<button title=${'x'} @click=${() => heard.push('first')}></button>`, container)
    render(html`<button title=${undefined} @click=${() => heard.push('second')}></button>`, container)
    find(container, 'button').click()
    expect(find(container, 'button').hasAttribute('title')).toBe(false)
    expect(heard).toEqual(['second'])
  })

  test('sets properties in their own case', () => {
    const container = document.createElement('div')
    render(html`<input .value=${'typed'} />`, container)
    expect(container.querySelector('input')?.value).toBe('typed')
  })

  test('swaps one template for another, and text for nothing', () => {
    const container = document.createElement('div')
    render(html`<p>${html`<b>bold</b>`}</p>`, container)
    render(html`<p>${html`<i>${'it'}</i>`}</p>`, container)
    expect(find(container, 'p').innerHTML).toBe('<!--i[--><i><!--i[-->it<!--i]--></i><!--i]-->')
    render(html`<p>${undefined}</p>`, container)
    expect(find(container, 'p').textContent).toBe('')
  })

  test('rejects two items with the same key', () => {
    const container = document.createElement('div')
    expect(() => {
      render(list([APPLE, APPLE], 'Fruit', ignore), container)
    }).toThrow('same key')
  })
})

describe('hydrate', () => {
  test("adopts the server's nodes", () => {
    const container = serverMarkup(list([APPLE, BANANA], 'Fruit', ignore))
    const rows = rowsIn(container)
    const ul = find(container, 'ul')
    expect(hasServerMarkup(container)).toBe(true)
    hydrate(list([APPLE, BANANA], 'Fruit', ignore), container)
    expect(hasServerMarkup(container)).toBe(false)
    expect(find(container, 'ul')).toBe(ul)
    expect(rowsIn(container)).toEqual(rows)
  })

  test('attaches handlers to the adopted nodes', () => {
    const container = serverMarkup(list([APPLE, BANANA], 'Fruit', ignore))
    /** @type {string[]} */
    const heard = []
    hydrate(
      list([APPLE, BANANA], 'Fruit', () => {
        heard.push('clicked')
      }),
      container,
    )
    find(container, 'li').click()
    expect(heard).toEqual(['clicked'])
  })

  test('updates adopted markup in place, and reconciles items the server did not have', () => {
    const container = serverMarkup(list([APPLE, BANANA], 'Fruit', ignore))
    const apple = find(container, 'li')
    hydrate(list([APPLE, BANANA, CHERRY], 'Fruit', ignore), container)
    render(list([APPLE, CHERRY], 'Fresh', ignore), container)
    expect(rowsIn(container).map((row) => row.textContent)).toEqual(['Apple', 'Cherry'])
    expect(find(container, 'li')).toBe(apple)
    expect(find(container, 'ul').getAttribute('title')).toBe('Fresh')
  })

  test('rejects markup rendered from a different template', () => {
    const container = serverMarkup(html`<p>${'a'}</p>`)
    expect(() => {
      hydrate(html`<p class=${'x'}>${'a'}</p>`, container)
    }).toThrow('different template')
  })
})
