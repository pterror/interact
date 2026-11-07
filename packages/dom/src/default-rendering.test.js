/** @import { ListPipeline } from '@interact/core/list-pipeline' */
/** @import { Extension } from '@interact/core/state' */
/** @import { TemplateResult } from './template.js' */

import { describe, expect, spyOn, test } from 'bun:test'

import { MemorySource, Store, inputHandler, keyInput, listPipeline, rowsOf } from '@interact/core'

import { css } from './css.js'
import { defaultRendering } from './default-rendering.js'
import { renderToString } from './render-string.js'
import { render } from './render.js'
import { storeView } from './store-view.js'

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
 * @param {(list: ListPipeline<string, TemplateResult>) => Extension} more - The other extensions
 * @returns {Readonly<{ list: ListPipeline<string, TemplateResult>, store: Store, root: HTMLElement }>} The list, its
 *   store and the element its view is in
 */
function shown(more) {
  /** @type {ListPipeline<string, TemplateResult>} */
  const list = listPipeline(new MemorySource(['apple', 'banana', 'cherry'], (item) => item))
  const store = new Store([
    list.extension,
    defaultRendering(list, { label: 'Fruit', text: (item) => item }),
    more(list),
  ])
  const view = storeView({ kind: 'fruit', render: (state) => list.render(state), styles })
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
          heard.push(`press ${String(input.value.position)}`)
        }
        return false
      }),
    )
    const container = root.querySelector('[part="list"]')
    const down = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowDown' })
    const other = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'x' })
    container?.dispatchEvent(down)
    container?.dispatchEvent(other)
    root.querySelector('[data-position="2"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(heard).toEqual(['key ArrowDown', 'key x', 'press 2'])
    expect([down.defaultPrevented, other.defaultPrevented]).toEqual([true, false])
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

  test('renders on the server as in the page', () => {
    const { list, store } = shown(() => [])
    expect(renderToString(list.render(store.state))).toContain(
      '<div data-position="1" part="row" role="option"><!--i[-->banana<!--i]--></div>',
    )
  })
})
