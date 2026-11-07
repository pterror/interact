/** @import { Entry, TemplateResult } from './template.js' */

import { describe, expect, test } from 'bun:test'

import {
  AttributePart,
  ChildPart,
  EventPart,
  PropertyPart,
  adoptInstance,
  clearRange,
  collect,
  createInstance,
  hasServerMarkup,
  hydrate,
  moveAfter,
  reconcile,
  removeRange,
  render,
} from './render.js'
import { html, repeat } from './template.js'
import { emptyHole, find, lastNode, outerRange, serverMarkup, watchChildren } from './test-helpers.js'

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

/**
 * A container holding `a`, then a range around `b`, then `c`.
 * @returns {Readonly<{ container: Element, range: Readonly<{ open: Comment, close: Comment }> }>} Them
 */
function setUp() {
  const container = document.createElement('div')
  const range = { close: document.createComment('i]'), open: document.createComment('i[') }
  container.append('a', range.open, 'b', range.close, 'c')
  return { container, range }
}

describe('ranges', () => {
  test('clears between the markers and keeps them', () => {
    const { container, range } = setUp()
    clearRange(range)
    expect(container.innerHTML).toBe('a<!--i[--><!--i]-->c')
  })

  test('removes the markers too', () => {
    const { container, range } = setUp()
    removeRange(range)
    expect(container.innerHTML).toBe('ac')
  })

  test('moves a range after a node', () => {
    const { container, range } = setUp()
    moveAfter(lastNode(container), range)
    expect(container.innerHTML).toBe('ac<!--i[-->b<!--i]-->')
  })
})

const TWO = 2

describe('collect', () => {
  test("finds a template's bound elements and child holes, not those of templates inside it", () => {
    const container = serverMarkup(html`<p class=${'a'}>${html`<b class=${'b'}>${'x'}</b>`}</p> ${'y'}`)
    const range = outerRange(container)
    const found = collect({ end: range.close, first: range.open.nextSibling })
    expect(found.elements.map((element) => element.tagName)).toEqual(['P'])
    expect(found.children).toHaveLength(TWO)
  })
})

describe('AttributePart', () => {
  test('sets, empties and removes the attribute, starting from what the element has', () => {
    const element = document.createElement('p')
    element.setAttribute('title', 'server')
    const part = new AttributePart(element, 'title')
    part.set('server')
    expect(element.getAttribute('title')).toBe('server')
    part.set(true)
    expect(element.getAttribute('title')).toBe('')
    part.set(false)
    expect(element.hasAttribute('title')).toBe(false)
  })
})

describe('PropertyPart', () => {
  test('sets the property only when the value changes', () => {
    const input = document.createElement('input')
    const part = new PropertyPart(input, 'value')
    part.set('a')
    input.value = 'typed'
    part.set('a')
    expect(input.value).toBe('typed')
    part.set('b')
    expect(input.value).toBe('b')
  })
})

describe('EventPart', () => {
  test('calls the handler it holds now, and none once cleared', () => {
    const button = document.createElement('button')
    const part = new EventPart(button, 'click')
    /** @type {string[]} */
    const heard = []
    part.set(() => {
      heard.push('a')
    })
    part.set(() => {
      heard.push('b')
    })
    button.click()
    part.set(undefined)
    button.click()
    expect(heard).toEqual(['b'])
  })
})

/**
 * A paragraph with a bound title.
 * @param {string} title - The title
 * @returns {TemplateResult} The template
 */
function paragraph(title) {
  return html`<p title=${title}>text</p>`
}

describe('TemplateInstance', () => {
  test('renders afresh and updates its parts', () => {
    const { instance, nodes } = createInstance(paragraph('a'), document)
    const container = document.createElement('div')
    container.append(nodes)
    instance.update(paragraph('b').values)
    expect(find(container, 'p').title).toBe('b')
  })

  test('adopts server markup between markers', () => {
    const container = serverMarkup(paragraph('a'))
    const server = find(container, 'p')
    adoptInstance(paragraph('b'), outerRange(container))
    expect(find(container, 'p')).toBe(server)
    expect(server.title).toBe('b')
  })
})

describe('ChildPart', () => {
  test('keeps its text node while the text changes', () => {
    const { container, range } = emptyHole()
    const part = new ChildPart(range, false)
    part.set('a')
    const text = range.open.nextSibling
    part.set('b')
    expect(range.open.nextSibling).toBe(text)
    expect(container.textContent).toBe('b')
  })

  test('replaces text with a template', () => {
    const { container, range } = emptyHole()
    const part = new ChildPart(range, false)
    part.set('a')
    part.set(html`<b>x</b>`)
    expect(find(container, 'b').textContent).toBe('x')
    expect(container.childNodes).toHaveLength([range.open, find(container, 'b'), range.close].length)
  })
})

/**
 * One entry per key, each an `<i>` showing it.
 * @param {readonly string[]} keys - The keys
 * @returns {readonly Entry[]} The entries
 */
function keyedRows(keys) {
  return repeat(
    keys,
    (key) => key,
    (key) => html`<i>${key}</i>`,
  ).entries
}

describe('reconcile', () => {
  test('keeps items without moving them when one goes from the front and one comes at the end', () => {
    const { container, range } = emptyHole()
    const first = reconcile([], keyedRows(['a', 'b', 'c']), range)
    const [, second, third] = first
    const touched = watchChildren(container)
    const next = reconcile(first, keyedRows(['b', 'c', 'd']), range)
    /** @type {Set<Node | undefined>} */
    const stayed = new Set([second?.range.open, third?.range.open])
    expect(next.map(({ key }) => key)).toEqual(['b', 'c', 'd'])
    expect(touched().filter((node) => stayed.has(node))).toEqual([])
    expect(container.textContent).toBe('bcd')
  })
})
