/** @import { ListPipeline } from '@interact/core/list-pipeline' */
/** @import { Extension } from '@interact/core/state' */
/** @import { TemplateResult } from './template.js' */

import { describe, expect, spyOn, test } from 'bun:test'

import { MemorySource, Store, inputHandler, keyInput, listPipeline, rowsOf } from '@interact/core'

import { css } from './css.js'
import { defaultRendering } from './default-rendering.js'
import { renderToString } from './render-string.js'
import { render } from './render.js'
import { mountStore, storeView, viewContent } from './store-view.js'

const styles = css`
  @layer test {
    :where(:scope) {
      display: block;
    }
  }
`

/**
 * A list of fruit with the default rendering and other extensions, rendered into a new element in the page, its view
 * plugins running.
 * @param {(list: ListPipeline<string, TemplateResult, MemorySource<string>>) => Extension} more - The other extensions
 * @returns {Readonly<{ list: ListPipeline<string, TemplateResult, MemorySource<string>>, store: Store, root: HTMLElement }>} The list, its
 *   store and the element its view is in
 */
function shown(more) {
  /** @type {ListPipeline<string, TemplateResult, MemorySource<string>>} */
  const list = listPipeline(new MemorySource(['apple', 'banana', 'cherry'], (item) => item))
  const store = new Store([
    list.extension,
    defaultRendering(list, { label: 'Fruit' }),
    viewContent.of((state) => list.render(state)),
    more(list),
  ])
  const view = storeView({ kind: 'fruit', styles })
  const root = document.createElement('div')
  document.body.append(root)
  render(view.render(store), root)
  view.rendered?.(store, root, () => undefined)
  store.subscribe(() => {
    render(view.render(store), root)
    view.rendered?.(store, root, () => undefined)
  })
  return { list, root, store }
}

describe('defaultRendering', () => {
  test("renders the list and its rows with every extension's attributes, a gap as an empty row", () => {
    const { root } = shown((list) => [
      list.attributes.of((row) => (row.kind === 'item' && row.position === 1 ? { part: 'active' } : {})),
      list.rows.of(() =>
        rowsOf([
          { from: 0, kind: 'gap', to: 1 },
          { kind: 'item', position: 1 },
          { kind: 'item', position: 2 },
        ]),
      ),
    ])
    const container = root.querySelector('[part="list"]')
    expect(container?.getAttribute('role')).toBe('listbox')
    expect(container?.getAttribute('aria-label')).toBe('Fruit')
    expect(
      [...(container?.children ?? [])].map((row) => `${row.getAttribute('part') ?? ''}:${row.textContent}`),
    ).toEqual(['gap:', 'active row:banana', 'row:cherry'])
  })

  test('hands keys and presses on rows to the store, preventing what they would do when taken', () => {
    /** @type {string[]} */
    const heard = []
    const { root } = shown((pipeline) =>
      inputHandler.of((input) => {
        if (input.is(keyInput)) {
          heard.push(`key ${input.value.key}`)
          return input.value.key === 'ArrowDown'
        }
        if (input.is(pipeline.press)) {
          heard.push(`press ${String(input.value.position)} ${String(input.value.count)}`)
        }
        return false
      }),
    )
    const container = root.querySelector('[part="list"]')
    const down = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowDown' })
    const other = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'x' })
    container?.dispatchEvent(down)
    container?.dispatchEvent(other)
    root.querySelector('[data-position="2"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 2 }))
    expect(heard).toEqual(['key ArrowDown', 'key x', 'press 2 2'])
    expect([down.defaultPrevented, other.defaultPrevented]).toEqual([true, false])
  })

  test('leaves keys pressed outside its list, and what happens in a view mounted inside its own', () => {
    /** @type {string[]} */
    const heard = []
    const { root } = shown((pipeline) =>
      inputHandler.of((input) => {
        heard.push(input.is(keyInput) ? `key ${input.value.key}` : input.is(pipeline.press) ? 'press' : '?')
        return false
      }),
    )
    const field = document.createElement('input')
    root.append(field)
    field.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }))
    const inner = shown(() => [])
    root.append(inner.root)
    mountStore(inner.store, inner.root)
    inner.root.querySelector('[data-position="0"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    inner.root.querySelector('[data-list]')?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'x' }))
    expect(heard).toEqual([])
  })

  test('hands the pointer moving over a row to the store, with where it is and whether the list has focus', () => {
    /** @type {string[]} */
    const heard = []
    const { root } = shown((pipeline) =>
      inputHandler.of((input) => {
        if (input.is(pipeline.hover)) {
          const { focused, position, x, y } = input.value
          heard.push(`${String(position)} at ${String(x)},${String(y)}${focused ? ' focused' : ''}`)
        }
        return false
      }),
    )
    const move = new PointerEvent('pointermove', { bubbles: true, clientX: 3, clientY: 4 })
    root.querySelector('[data-position="1"]')?.dispatchEvent(move)
    expect(heard).toEqual(['1 at 3,4'])
  })

  test('brings a revealed row into view, unless an extension shows revealed items itself', () => {
    const scrolled = spyOn(HTMLElement.prototype, 'scrollIntoView')
    const plain = shown(() => [])
    plain.store.dispatch({ effects: plain.list.reveal.of(2) })
    const windowed = shown((list) => list.reveals.of(true))
    windowed.store.dispatch({ effects: windowed.list.reveal.of(2) })
    expect(scrolled).toHaveBeenCalledTimes(1)
    scrolled.mockRestore()
  })

  test("shows each item by the list's own text", () => {
    const { root } = shown((list) => list.text.of((item) => item.toUpperCase()))
    expect(root.querySelector('[data-position="0"]')?.textContent).toBe('APPLE')
  })

  test('renders on the server as in the page', () => {
    const { list, store } = shown(() => [])
    expect(renderToString(list.render(store.state))).toContain(
      '<div data-position="1" part="row" role="option"><!--i[-->banana<!--i]--></div>',
    )
    expect(renderToString(list.render(store.state))).toContain(
      '<div aria-label="Fruit" data-list="" part="list" role="listbox" tabindex="0">',
    )
  })
})
