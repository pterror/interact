/**
 * @import { ListPipeline } from '@interact/core/list-pipeline'
 * @import { ItemSource } from '@interact/core/source'
 * @import { Extension } from '@interact/core/state'
 * @import { TemplateResult } from './template.js'
 */

import { keyInput, precedence } from '@interact/core'

import { viewPlugin } from './store-view.js'
import { attributes, html, repeat } from './template.js'

/**
 * What the default rendering says the list and its rows are, and the list's accessible name: what an extension giving
 * them as attributes doesn't say. An item's text is the list's own (`text`).
 * @typedef {Readonly<{ role?: string, rowRole?: string, label?: string }>} RenderingOptions
 */

/**
 * The plain rendering of a list, last of every step so any other wraps or replaces it: the list as an element with the
 * attributes every extension gives it, holding a row for each row rendered, an item row showing its item's text (or
 * nothing until it has been read), a gap row as an empty element whose size its extension's attributes set. In the
 * page it hands keys to the store as `keyInput`s and presses on rows as the list's `press`, and, unless an extension
 * shows revealed items itself (`reveals`), brings a revealed row's element into view.
 * @template T
 * @template {ItemSource<T>} S
 * @param {ListPipeline<T, TemplateResult, S>} list - The list
 * @param {RenderingOptions} [options] - What it says the list and rows are, and the list's name
 * @returns {Extension} The rendering
 */
function defaultRendering(list, options = {}) {
  const { label, role = 'listbox', rowRole = 'option' } = options
  const page = viewPlugin((store, root) => {
    /**
     * A key pressed in the list, offered to the store, unless an input method is composing.
     * @param {Event} event - The event
     * @returns {void}
     */
    const keydown = (event) => {
      if (!(event instanceof KeyboardEvent) || event.isComposing) {
        return
      }
      const key = { alt: event.altKey, key: event.key, shift: event.shiftKey, toggle: event.ctrlKey || event.metaKey }
      if (store.handle(keyInput.of(key))) {
        event.preventDefault()
      }
    }
    /**
     * A press on a row, offered to the store.
     * @param {Event} event - The event
     * @returns {void}
     */
    const click = (event) => {
      const row = event.target instanceof Element ? event.target.closest('[data-position]') : undefined
      if (!(event instanceof MouseEvent) || !(row instanceof HTMLElement) || !root.contains(row)) {
        return
      }
      const position = Number(row.dataset['position'])
      const press = { count: event.detail, position, shift: event.shiftKey, toggle: event.ctrlKey || event.metaKey }
      if (store.handle(list.press.of(press))) {
        event.preventDefault()
      }
    }
    root.addEventListener('keydown', keydown)
    root.addEventListener('click', click)
    return {
      destroy: () => {
        root.removeEventListener('keydown', keydown)
        root.removeEventListener('click', click)
      },
      rendered: (transactions) => {
        const revealed = transactions.flatMap((transaction) => transaction.effectsOf(list.reveal)).at(-1)
        if (revealed !== undefined && !store.state.facet(list.reveals)) {
          root.querySelector(`[data-position="${String(revealed)}"]`)?.scrollIntoView({ block: 'nearest' })
        }
      },
    }
  })
  return precedence('lowest', [
    list.attributes.of((row) =>
      row.kind === 'item'
        ? {
            'aria-busy': row.item === undefined ? 'true' : undefined,
            'data-position': row.position,
            part: 'row',
            role: rowRole,
          }
        : { 'aria-hidden': 'true', part: 'gap' },
    ),
    list.containerAttributes.of(() => ({ 'aria-label': label, part: 'list', role, tabindex: 0 })),
    list.item.of(
      (row, _next, state) =>
        html`<div ${attributes(list.attributesOf(row, state))}
          >${row.kind === 'item' && row.item !== undefined ? state.facet(list.text)(row.item) : ''}</div
        >`,
    ),
    list.container.of(
      (children, _next, state) =>
        html`<div ${attributes(list.containerAttributesOf(state))}
          >${repeat(
            children,
            (child) => child.key,
            (child) => child.rendered,
          )}</div
        >`,
    ),
    page,
  ])
}

export { defaultRendering }
