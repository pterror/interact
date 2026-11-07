/**
 * @import { ListPipeline } from '@interact/core/list-pipeline'
 * @import { TemplateResult } from '@interact/dom/template'
 */

import { describe, expect, test } from 'bun:test'

import { MemorySource, Store, listPipeline } from '@interact/core'
import { css, defaultRendering, deepActiveElement, render, storeView, viewContent } from '@interact/dom'

import { active } from './active-item.js'
import { followPointer } from './follow-pointer.js'

const styles = css`
  @layer test {
    :where(:scope) {
      display: block;
    }
  }
`

/**
 * A list of fruit whose active item follows the pointer, passing over banana, shown in a new element in the page.
 * @param {boolean} focus - Whether focus comes to the list too
 * @returns {Readonly<{ store: Store, root: HTMLElement, at: () => number | undefined }>} Its store, the element its
 *   view is in, and where its active item is
 */
function shown(focus) {
  /** @type {ListPipeline<string, TemplateResult, MemorySource<string>>} */
  const list = listPipeline(new MemorySource(['apple', 'banana', 'cherry'], (item) => item))
  const current = active(list)
  const store = new Store([
    followPointer(current, { focus }),
    current.skip.of((item) => item === 'banana'),
    defaultRendering(list),
    viewContent.of((state) => list.render(state)),
  ])
  const view = storeView({ kind: 'fruit', styles })
  const root = document.createElement('div')
  document.body.replaceChildren(root)
  /** @returns {void} */
  const again = () => {
    render(view.render(store), root)
    view.rendered?.(store, root, again)
  }
  again()
  store.subscribe(again)
  return { at: () => current.positionIn(store.state), root, store }
}

/**
 * The pointer moving over a row.
 * @param {HTMLElement} root - Where the view is
 * @param {number} position - The row's position
 * @returns {void}
 */
function over(root, position) {
  root
    .querySelector(`[data-position="${String(position)}"]`)
    ?.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }))
}

describe('the active item following the pointer', () => {
  test('goes to the item the pointer is over, but never one focus passes over', () => {
    const { at, root } = shown(false)
    over(root, 2)
    const first = at()
    over(root, 1)
    expect([first, at(), deepActiveElement(document)]).toEqual([2, 2, document.body])
  })

  test('brings focus to the list when told to', () => {
    const { root } = shown(true)
    over(root, 0)
    expect(deepActiveElement(document)?.getAttribute('role')).toBe('listbox')
  })
})
